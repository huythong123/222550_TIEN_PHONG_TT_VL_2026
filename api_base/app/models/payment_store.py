from datetime import datetime, timedelta
from typing import Optional

from app.db import SessionLocal
from app.models.payment_entity import PaymentEntity
from app.config import settings


SECRET_XOR_KEY = getattr(settings, 'PAYMENT_XOR_KEY_INT', 0x5EAFB)


def encode_payment_id(p_id: int) -> str:
    return hex(p_id ^ SECRET_XOR_KEY)[2:].upper()


def decode_payment_id(hex_str: str) -> int:
    return int(hex_str, 16) ^ SECRET_XOR_KEY


def create_payment(user_id: int, amount_usd: float, amount_vnd: int, credits: int, expire_minutes: int = 60) -> dict:
    expires = datetime.utcnow() + timedelta(minutes=expire_minutes) if expire_minutes else None
    with SessionLocal() as db:
        p = PaymentEntity(user_id=user_id, amount_usd=float(amount_usd), amount_vnd=int(amount_vnd), credits=int(credits), status='pending', expires_at=expires)
        db.add(p)
        db.commit()
        db.refresh(p)
        return {
            'id': p.id,
            'user_id': p.user_id,
            'amount_usd': p.amount_usd,
            'amount_vnd': p.amount_vnd,
            'credits': p.credits,
            'status': p.status,
            'created_at': p.created_at.isoformat(),
            'expires_at': p.expires_at.isoformat() if p.expires_at else None,
        }


def get_payment_by_id(p_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        p = db.query(PaymentEntity).filter(PaymentEntity.id == p_id).first()
        if not p:
            return None
        return {
            'id': p.id,
            'user_id': p.user_id,
            'amount_usd': p.amount_usd,
            'amount_vnd': p.amount_vnd,
            'credits': p.credits,
            'status': p.status,
            'matched_tx_id': p.matched_tx_id,
            'created_at': p.created_at.isoformat(),
            'expires_at': p.expires_at.isoformat() if p.expires_at else None,
        }


def update_payment_status(p_id: int, status: str, matched_tx_id: str | None = None) -> bool:
    with SessionLocal() as db:
        p = db.query(PaymentEntity).filter(PaymentEntity.id == p_id).first()
        if not p:
            return False
        p.status = status
        if matched_tx_id:
            p.matched_tx_id = matched_tx_id
        db.add(p)
        db.commit()
        return True


def get_payment_by_matched_tx(matched_tx_id: str) -> Optional[dict]:
    """Return a payment record that already used this matched_tx_id, or None."""
    with SessionLocal() as db:
        p = db.query(PaymentEntity).filter(PaymentEntity.matched_tx_id == str(matched_tx_id)).first()
        if not p:
            return None
        return {
            'id': p.id,
            'user_id': p.user_id,
            'amount_usd': p.amount_usd,
            'amount_vnd': p.amount_vnd,
            'credits': p.credits,
            'status': p.status,
            'matched_tx_id': p.matched_tx_id,
            'created_at': p.created_at.isoformat(),
            'expires_at': p.expires_at.isoformat() if p.expires_at else None,
        }
