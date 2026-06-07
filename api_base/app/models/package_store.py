from typing import Optional, List

from app.db import SessionLocal
from app.models.package_entity import PackageEntity


def list_packages() -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(PackageEntity).order_by(PackageEntity.id.desc()).all()
        return [
            {
                'id': r.id,
                'name': r.name,
                'description': r.description,
                'credits': r.credits,
                'price_cents': r.price_cents,
            }
            for r in rows
        ]


def create_package(name: str, credits: int, price_cents: int, description: Optional[str] = None) -> dict:
    with SessionLocal() as db:
        p = PackageEntity(name=name, credits=int(credits), price_cents=int(price_cents), description=description)
        db.add(p)
        db.commit()
        db.refresh(p)
        return {
            'id': p.id,
            'name': p.name,
            'credits': p.credits,
            'price_cents': p.price_cents,
            'description': p.description,
        }


def get_package(package_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        p = db.query(PackageEntity).filter(PackageEntity.id == package_id).first()
        if not p:
            return None
        return {
            'id': p.id,
            'name': p.name,
            'credits': p.credits,
            'price_cents': p.price_cents,
            'description': p.description,
        }


def update_package(package_id: int, name: str, credits: int, price_cents: int, description: Optional[str] = None) -> Optional[dict]:
    with SessionLocal() as db:
        p = db.query(PackageEntity).filter(PackageEntity.id == package_id).first()
        if not p:
            return None
        p.name = name
        p.credits = int(credits)
        p.price_cents = int(price_cents)
        p.description = description
        db.add(p)
        db.commit()
        db.refresh(p)
        return {
            'id': p.id,
            'name': p.name,
            'credits': p.credits,
            'price_cents': p.price_cents,
            'description': p.description,
        }


def delete_package(package_id: int) -> bool:
    with SessionLocal() as db:
        p = db.query(PackageEntity).filter(PackageEntity.id == package_id).first()
        if not p:
            return False
        db.delete(p)
        db.commit()
        return True
