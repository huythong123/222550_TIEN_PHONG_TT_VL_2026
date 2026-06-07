from typing import Optional, List

from app.db import SessionLocal
from app.models.system_setting_entity import SystemSettingEntity


def list_settings() -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(SystemSettingEntity).order_by(SystemSettingEntity.key.asc()).all()
        return [
            {
                'id': r.id,
                'key': r.key,
                'value': r.value,
                'description': r.description,
            }
            for r in rows
        ]


def get_setting(key: str) -> Optional[dict]:
    with SessionLocal() as db:
        r = db.query(SystemSettingEntity).filter(SystemSettingEntity.key == key).first()
        if not r:
            return None
        return {'id': r.id, 'key': r.key, 'value': r.value, 'description': r.description}


def set_setting(key: str, value: str, description: str | None = None) -> dict:
    with SessionLocal() as db:
        existing = db.query(SystemSettingEntity).filter(SystemSettingEntity.key == key).first()
        if existing:
            existing.value = value
            existing.description = description
            db.commit()
            db.refresh(existing)
            return {'id': existing.id, 'key': existing.key, 'value': existing.value, 'description': existing.description}
        new = SystemSettingEntity(key=key, value=value, description=description)
        db.add(new)
        db.commit()
        db.refresh(new)
        return {'id': new.id, 'key': new.key, 'value': new.value, 'description': new.description}
