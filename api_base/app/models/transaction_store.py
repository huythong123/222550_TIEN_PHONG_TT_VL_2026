from typing import Optional, List

from app.db import SessionLocal
from app.models.credit_transaction_entity import CreditTransactionEntity


def list_transactions(limit: int = 100, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(CreditTransactionEntity).order_by(CreditTransactionEntity.id.desc()).offset(offset).limit(limit).all()
        return [
            {
                'id': r.id,
                'user_id': r.user_id,
                'delta': r.delta,
                'reason': r.reason,
                'created_by': r.created_by,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]


def create_transaction(user_id: int, delta: int, reason: str | None = None, created_by: str | None = None) -> dict:
    with SessionLocal() as db:
        t = CreditTransactionEntity(user_id=user_id, delta=int(delta), reason=reason, created_by=created_by)
        db.add(t)
        db.commit()
        db.refresh(t)
        return {
            'id': t.id,
            'user_id': t.user_id,
            'delta': t.delta,
            'reason': t.reason,
            'created_by': t.created_by,
            'created_at': t.created_at.isoformat(),
        }
