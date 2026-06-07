from typing import List, Optional
from app.db import SessionLocal
from app.models.login_log_entity import LoginLogEntity


def create_login_log(user_id: Optional[int], ip_address: Optional[str], browser: Optional[str], device: Optional[str], success: bool) -> dict:
    with SessionLocal() as db:
        e = LoginLogEntity(user_id=user_id, ip_address=ip_address, browser=browser, device=device, success=bool(success))
        db.add(e)
        db.commit()
        db.refresh(e)
        return {
            'id': e.id,
            'user_id': e.user_id,
            'ip_address': e.ip_address,
            'browser': e.browser,
            'device': e.device,
            'success': e.success,
            'created_at': e.created_at.isoformat(),
        }


def list_login_logs(limit: int = 100, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(LoginLogEntity).order_by(LoginLogEntity.id.desc()).offset(offset).limit(limit).all()
        return [
            {
                'id': r.id,
                'user_id': r.user_id,
                'ip_address': r.ip_address,
                'browser': r.browser,
                'device': r.device,
                'success': r.success,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
