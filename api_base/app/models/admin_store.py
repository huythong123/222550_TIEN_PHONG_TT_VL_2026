from typing import List, Optional
from sqlalchemy import text

from app.db import SessionLocal
from app.models.admin_entity import AdminActionLog


def add_admin_log(admin_user_id: int, action_type: str, target_user_id: Optional[int] = None, details: Optional[str] = None) -> dict:
    with SessionLocal() as db:
        entry = AdminActionLog(
            admin_user_id=admin_user_id,
            action_type=action_type,
            target_user_id=target_user_id,
            details=details,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {
            'id': entry.id,
            'admin_user_id': entry.admin_user_id,
            'action_type': entry.action_type,
            'target_user_id': entry.target_user_id,
            'details': entry.details,
            'created_at': entry.created_at.isoformat(),
        }


def list_admin_logs(limit: int = 100, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(AdminActionLog).order_by(AdminActionLog.id.desc()).limit(limit).offset(offset).all()
        return [
            {
                'id': r.id,
                'admin_user_id': r.admin_user_id,
                'action_type': r.action_type,
                'target_user_id': r.target_user_id,
                'details': r.details,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]


def get_admin_log(log_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        r = db.query(AdminActionLog).filter(AdminActionLog.id == log_id).first()
        if not r:
            return None
        return {
            'id': r.id,
            'admin_user_id': r.admin_user_id,
            'action_type': r.action_type,
            'target_user_id': r.target_user_id,
            'details': r.details,
            'created_at': r.created_at.isoformat(),
        }


def list_admin_logs_for_user(user_id: int, limit: int = 100, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = (
            db.query(AdminActionLog)
            .filter(AdminActionLog.target_user_id == user_id)
            .order_by(AdminActionLog.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return [
            {
                'id': r.id,
                'admin_user_id': r.admin_user_id,
                'action_type': r.action_type,
                'target_user_id': r.target_user_id,
                'details': r.details,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
