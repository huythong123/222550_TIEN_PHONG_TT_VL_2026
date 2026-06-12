import re
from datetime import datetime
from urllib.parse import quote_plus

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.config import settings
from app.models.payment_store import create_payment, get_payment_by_id, update_payment_status, encode_payment_id, decode_payment_id, get_payment_by_matched_tx
from app.models.user_store import get_user_by_id, adjust_user_credits
from app.models.transaction_store import create_transaction
from app.utils.sepay_helper import get_last_transactions
from app.utils.settings_helper import get_db_setting
from app.security.auth import get_current_user

router = APIRouter()


@router.get('/payment/debug/sepay-transactions')
def api_debug_sepay_transactions(user=Depends(get_current_user)):
    """Debug endpoint: return raw SePay transactions for inspection."""
    try:
        history = get_last_transactions(limit=100)
        return {'count': len(history), 'transactions': history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreatePaymentIn(BaseModel):
    # Accept either amount_vnd (VND) or legacy amount (USD). Allow coercion from strings.
    amount_vnd: int | None = None
    amount: float | None = None


@router.post('/payment/create')
def api_create_payment(payload: CreatePaymentIn, user=Depends(get_current_user)):
    try:
        user_id = int(user.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Không lấy được thông tin user')

    # debug log payload shape for validation
    try:
        # payload is a pydantic model; access fields safely
        incoming = payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()
    except Exception:
        incoming = {}

    # Determine amount_vnd (prefer amount_vnd; fallback to amount as USD)
    amount_vnd = None
    if payload.amount_vnd is not None:
        try:
            amount_vnd = int(payload.amount_vnd)
        except Exception:
            raise HTTPException(status_code=400, detail='Số tiền (VND) không hợp lệ')
    elif payload.amount is not None:
        # legacy USD amount sent by some clients
        try:
            rate = getattr(settings, 'USD_TO_VND', 24000)
            amount_vnd = int(round(float(payload.amount) * float(rate)))
        except Exception:
            raise HTTPException(status_code=400, detail='Số tiền (USD) không hợp lệ')

    if not amount_vnd or amount_vnd <= 0:
        raise HTTPException(status_code=400, detail='Số tiền phải lớn hơn 0')

    # compute equivalent USD for record-keeping
    rate = getattr(settings, 'USD_TO_VND', 24000)
    try:
        dollars = float(amount_vnd) / float(rate)
    except Exception:
        dollars = 0.0

    # compute credits based on VND pricing: 2000 VND -> 30 credits, scale linearly
    try:
        credits = int(round((float(amount_vnd) / 2000.0) * 30.0))
    except Exception:
        credits = 0

    p = create_payment(user_id=user_id, amount_usd=dollars, amount_vnd=amount_vnd, credits=credits, expire_minutes=getattr(settings, 'PAYMENT_EXPIRE_MINUTES', 60))
    hex_id = encode_payment_id(p['id'])

    # Build a Sepay-compatible transfer message and QR image URL
    # Sepay requires the transfer description to contain 'SEVQR' to route correctly.
    # Prefix with 'SEVQR ' to ensure the required token is present.
    qr_text = f"SEVQR {getattr(settings, 'NAME_WEB', settings.APP_NAME)}NAPTOKEN{hex_id}"
    bank = get_db_setting('SEPAY_BANK_BRAND')
    acc = get_db_setting('SEPAY_ACCOUNT_NUMBER')
    # Sepay QR image endpoint. Use URL-encoded description (des) parameter
    qr_url = None
    if bank and acc:
        try:
            qr_url = f"https://qr.sepay.vn/img?bank={quote_plus(bank)}&acc={quote_plus(str(acc))}&template=compact&des={quote_plus(qr_text)}"
        except Exception:
            qr_url = None

    account_name = get_db_setting('SEPAY_ACCOUNT_NAME') or None

    return {
        'hex_id': hex_id,
        'amount_vnd': amount_vnd,
        'qr_text': qr_text,
        'qr_url': qr_url,
        'expires_at': p.get('expires_at'),
        'account_number': acc,
        'account_name': account_name,
        'bank_brand': bank,
    }


@router.get('/payment/status/{hex_id}')
def api_payment_status(hex_id: str, user=Depends(get_current_user)):
    try:
        p_id = decode_payment_id(hex_id)
    except Exception:
        raise HTTPException(status_code=400, detail='Mã hóa đơn không hợp lệ')

    p = get_payment_by_id(p_id)
    if not p:
        raise HTTPException(status_code=404, detail='Không tìm thấy hóa đơn')

    # If already completed, return
    if p.get('status') == 'completed':
        return {'status': 'completed', 'credits': p.get('credits')}

    # Check transactions from SePay
    prefix = f"{getattr(settings, 'NAME_WEB', settings.APP_NAME)}NAPTOKEN"
    pattern = rf"{re.escape(prefix)}([A-Fa-f0-9]+)"
    history = get_last_transactions(limit=40)
    # Add some debug logging and robust field handling
    tolerance = int(getattr(settings, 'PAYMENT_MATCH_TOLERANCE_VND', 0) or 0)
    for tx in history:
        # try multiple possible fields for description/content (include Sepay's transaction_content)
        content = (
            tx.get('content')
            or tx.get('description')
            or tx.get('des')
            or tx.get('note')
            or tx.get('message')
            or tx.get('detail')
            or tx.get('desc')
            or tx.get('transaction_content')
            or ''
        )
        # try multiple possible fields for amount
        raw_amount = tx.get('amount_in') or tx.get('amount') or tx.get('amount_in_vnd') or tx.get('amount_incoming') or tx.get('amount_value') or 0
        try:
            amount = float(str(raw_amount).replace(',', '').strip() or 0)
        except Exception:
            amount = 0.0

        # debug print a short preview
        try:
            print(f"[payment.status] checking tx id={tx.get('id')} amt={amount} content_preview={str(content)[:120]}")
        except Exception:
            pass

        match = re.search(pattern, str(content or ''), re.IGNORECASE)
        expected = int(p.get('amount_vnd', 0) or 0)
        if match:
            found_hex = match.group(1).upper()
            # allow tolerance for fees/rounding
            if found_hex == hex_id.upper() and amount + tolerance >= float(expected):
                print(f"[payment.status] matched tx id={tx.get('id')} hex={found_hex} amount={amount} expected={expected}")
                # ensure this tx hasn't been used already by another payment
                existing = get_payment_by_matched_tx(str(tx.get('id')))
                if existing:
                    print(f"[payment.status] tx id={tx.get('id')} already consumed by payment id={existing.get('id')}, skipping")
                else:
                    # mark completed, credit user
                    update_payment_status(p_id, 'completed', matched_tx_id=str(tx.get('id')))
                    try:
                        adjust_user_credits(p.get('user_id'), int(p.get('credits', 0)))
                        amt = int(p.get('amount_vnd', 0) or 0)
                        create_transaction(p.get('user_id'), int(p.get('credits', 0)), reason=f"nạp tiền qua SePay id={hex_id} amount_vnd={amt}")
                    except Exception as e:
                        print(f"[payment.status] error crediting user: {e}")
                    return {'status': 'completed', 'credits': p.get('credits')}
        else:
            # Fallback: if content is empty or doesn't contain token, but amount matches and destination account matches,
            # consider this a candidate for auto-match (use with caution). We check multiple possible account fields.
            try:
                to_account = (
                    tx.get('to_account')
                    or tx.get('acc')
                    or tx.get('account')
                    or tx.get('dest_account')
                    or tx.get('destination')
                    or tx.get('account_number')
                    or ''
                )
            except Exception:
                to_account = ''
            try:
                # normalize account strings
                to_account_str = str(to_account).replace(' ', '')
            except Exception:
                to_account_str = str(to_account)

            if (not content or str(content).strip() == '') and amount + tolerance >= float(expected):
                # check if tx goes to our configured account
                configured_acc = get_db_setting('SEPAY_ACCOUNT_NUMBER')
                if configured_acc and configured_acc in to_account_str:
                    print(f"[payment.status] fallback matched tx id={tx.get('id')} amt={amount} to_acc={to_account_str} expected={expected}")
                    existing = get_payment_by_matched_tx(str(tx.get('id')))
                    if existing:
                        print(f"[payment.status] tx id={tx.get('id')} already consumed by payment id={existing.get('id')} (fallback), skipping")
                    else:
                        update_payment_status(p_id, 'completed', matched_tx_id=str(tx.get('id')))
                        try:
                            adjust_user_credits(p.get('user_id'), int(p.get('credits', 0)))
                            amt = int(p.get('amount_vnd', 0) or 0)
                            create_transaction(p.get('user_id'), int(p.get('credits', 0)), reason=f"nạp tiền (fallback) qua SePay id={hex_id} amount_vnd={amt}")
                        except Exception as e:
                            print(f"[payment.status] error crediting user (fallback): {e}")
                        return {'status': 'completed', 'credits': p.get('credits')}

    # Not found; check expiry
    expires_at = p.get('expires_at')
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at)
            if exp_dt < datetime.utcnow():
                # mark failed (but can still be updated later)
                update_payment_status(p_id, 'failed')
                return {'status': 'failed'}
        except Exception:
            pass

    return {'status': p.get('status', 'pending')}
