from typing import List, Optional
from app.db import SessionLocal
from app.models.activity_log_entity import ActivityLogEntity


def create_activity(user_id: Optional[int], action: str, detail: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> dict:
    with SessionLocal() as db:
        e = ActivityLogEntity(user_id=user_id, action=action, detail=detail, ip_address=ip_address, user_agent=user_agent)
        db.add(e)
        db.commit()
        db.refresh(e)
        return {
            'id': e.id,
            'user_id': e.user_id,
            'action': e.action,
            'detail': e.detail,
            'ip_address': e.ip_address,
            'user_agent': e.user_agent,
            'created_at': e.created_at.isoformat(),
        }


def list_activities(limit: int = 50, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(ActivityLogEntity).order_by(ActivityLogEntity.id.desc()).offset(offset).limit(limit).all()
        return [
            {
                'id': r.id,
                'user_id': r.user_id,
                'action': r.action,
                'detail': r.detail,
                'ip_address': r.ip_address,
                'user_agent': r.user_agent,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
