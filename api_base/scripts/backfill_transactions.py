"""
Backfill script: append amount_vnd to credit_transactions.reason for SePay-created transactions

Run with:
    py scripts\backfill_transactions.py

It will:
 - look for credit transactions where reason contains 'SePay' and does NOT contain 'amount_vnd='
 - try to extract hex id (e.g., id=5EAE1) and decode to payment id
 - fetch payment.amount_vnd and append ' amount_vnd=NNN' to transaction.reason
 - commit updates

Make a DB backup before running.
"""
import sys
from pathlib import Path

# Ensure project root (api_base) is on sys.path so `import app` works when running this script directly
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db import SessionLocal
from app.models.credit_transaction_entity import CreditTransactionEntity
from app.models.payment_store import get_payment_by_id, decode_payment_id
import re

LIMIT = 1000

def main():
    with SessionLocal() as db:
        rows = db.query(CreditTransactionEntity).filter(CreditTransactionEntity.reason != None).filter(~CreditTransactionEntity.reason.contains('amount_vnd='))
        rows = rows.order_by(CreditTransactionEntity.id.asc()).limit(LIMIT).all()
        updated = 0
        for r in rows:
            reason = r.reason or ''
            # look for hex id patterns like id=5EAE1 or id=5EAEF
            m = re.search(r'id=([A-Fa-f0-9]+)', reason)
            if not m:
                continue
            hex_id = m.group(1).upper()
            try:
                p_id = decode_payment_id(hex_id)
            except Exception:
                continue
            payment = get_payment_by_id(p_id)
            if not payment:
                continue
            amt = int(payment.get('amount_vnd', 0) or 0)
            if amt <= 0:
                continue
            # append amount_vnd marker
            new_reason = f"{reason} amount_vnd={amt}"
            r.reason = new_reason
            db.add(r)
            try:
                db.commit()
                updated += 1
                print(f"Updated tx id={r.id} -> amount_vnd={amt}")
            except Exception as e:
                db.rollback()
                print(f"Failed to update tx id={r.id}: {e}")
        print(f"Done. Updated {updated} rows.")

if __name__ == '__main__':
    main()
