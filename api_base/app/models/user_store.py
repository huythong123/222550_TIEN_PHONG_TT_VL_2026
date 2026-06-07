import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import inspect, or_, text

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models.user_entity import UserEntity
from app.models.user_models import UserCreate
from app.security.auth import get_password_hash
from app.services.email_service import build_verification_url, send_verification_email
# Ensure new model classes are imported so SQLAlchemy metadata includes them
from app.models.package_entity import PackageEntity
from app.models.credit_transaction_entity import CreditTransactionEntity
from app.models.video_entity import VideoEntity
from app.models.video_scene_entity import VideoSceneEntity
from app.models.system_setting_entity import SystemSettingEntity
from app.models.activity_log_entity import ActivityLogEntity
from app.models.login_log_entity import LoginLogEntity
from app.models.prompt_log_entity import PromptLogEntity
from app.models.admin_entity import AdminActionLog
from app.models.payment_entity import PaymentEntity


def _to_dict(user: UserEntity) -> dict:
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'google_sub': user.google_sub,
        'auth_provider': user.auth_provider,
        'role': 'admin' if user.is_admin else 'user',
        'hashed_password': user.hashed_password,
        'is_admin': user.is_admin,
        'email_verified': user.email_verified,
        'credits': getattr(user, 'credits', 0),
    }


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _generate_verification_token() -> tuple[str, str, datetime]:
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    return raw_token, token_hash, expires_at


def _ensure_user_columns() -> None:
    inspector = inspect(engine)
    if 'users' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('users')}

    with engine.begin() as connection:
        if 'email_verified' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0'))
        if 'email_verification_token_hash' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR(255) NULL'))
        if 'email_verification_expires_at' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME NULL'))
        if 'google_sub' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL'))
            connection.execute(text('CREATE UNIQUE INDEX ix_users_google_sub ON users (google_sub)'))
        if 'auth_provider' not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local'"))
        # Ensure credits column exists independently of auth_provider
        if 'credits' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0'))
        # Account control columns
        if 'is_active' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1'))
        if 'is_banned' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT 0'))
        if 'ban_reason' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN ban_reason VARCHAR(512) NULL'))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()

    with SessionLocal() as db:
        has_admin = db.query(UserEntity).filter(UserEntity.is_admin.is_(True)).first()
        if has_admin:
            if has_admin.email and not has_admin.email_verified:
                has_admin.email_verified = True
                db.commit()
            return

        admin = UserEntity(
            username=settings.DEFAULT_ADMIN_USERNAME,
            email=settings.DEFAULT_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
            is_admin=True,
            email_verified=True,
        )
        db.add(admin)
        db.commit()


def list_users() -> list[dict]:
    with SessionLocal() as db:
        users = db.query(UserEntity).order_by(UserEntity.id.desc()).all()
        return [_to_dict(u) for u in users]


def _create_user_record(username: str, email: str | None, password: str, is_admin: bool, verify_email: bool) -> dict:
    with SessionLocal() as db:
        existed = db.query(UserEntity).filter(UserEntity.username == username).first()
        if existed:
            raise ValueError('Tên đăng nhập đã tồn tại')

        if email:
            email_existed = db.query(UserEntity).filter(UserEntity.email == email).first()
            if email_existed:
                raise ValueError('Email đã tồn tại')

        verification_token = None
        verification_token_hash = None
        verification_expires_at = None
        email_verified = not bool(email)

        if email and verify_email:
            verification_token, verification_token_hash, verification_expires_at = _generate_verification_token()
            email_verified = False

        new_user = UserEntity(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            auth_provider='local',
            is_admin=is_admin,
            email_verified=email_verified,
            email_verification_token_hash=verification_token_hash,
            email_verification_expires_at=verification_expires_at,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        verification_url = None
        verification_sent = False
        if email and verification_token:
            verification_url = build_verification_url(verification_token)
            try:
                send_verification_email(email, verification_url)
                verification_sent = True
            except Exception:
                verification_sent = False

        return {
            **_to_dict(new_user),
            'verification_required': bool(email),
            'verification_sent': verification_sent,
            'verification_url': verification_url,
        }


def create_user(payload: UserCreate) -> dict:
    return _create_user_record(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        is_admin=(payload.role == 'admin'),
        verify_email=True,
    )


def create_email_user(email: str, password: str) -> dict:
    local_part = email.split('@', 1)[0].strip().lower()
    username = local_part or 'user'
    suffix = 1

    with SessionLocal() as db:
        candidate = username
        while db.query(UserEntity).filter(UserEntity.username == candidate).first():
            suffix += 1
            candidate = f"{username}{suffix}"

    return _create_user_record(
        username=candidate,
        email=email,
        password=password,
        is_admin=False,
        verify_email=True,
    )


def delete_user(user_id: int) -> bool:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            return False

        db.delete(user)
        db.commit()
        return True


def verify_user_email(token: str) -> bool:
    token_hash = _hash_token(token)

    with SessionLocal() as db:
        user = (
            db.query(UserEntity)
            .filter(UserEntity.email_verification_token_hash == token_hash)
            .first()
        )
        if not user:
            return False

        if user.email_verified:
            return True

        if user.email_verification_expires_at and user.email_verification_expires_at < datetime.utcnow():
            return False

        user.email_verified = True
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None
        db.commit()
        return True


def resend_verification_email(email: str) -> bool:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.email == email).first()
        if not user or user.email_verified:
            return False

        verification_token, verification_token_hash, verification_expires_at = _generate_verification_token()
        user.email_verification_token_hash = verification_token_hash
        user.email_verification_expires_at = verification_expires_at
        db.commit()

    verification_url = build_verification_url(verification_token)
    send_verification_email(email, verification_url)
    return True


def find_user_by_username_or_email(identifier: str) -> Optional[dict]:
    with SessionLocal() as db:
        user = (
            db.query(UserEntity)
            .filter(or_(UserEntity.username == identifier, UserEntity.email == identifier))
            .first()
        )
        return _to_dict(user) if user else None


def find_or_create_google_user(email: str, google_sub: str, full_name: str | None = None) -> dict:
    local_part = email.split('@', 1)[0].strip().lower()
    base_username = local_part or 'google_user'

    with SessionLocal() as db:
        existing_by_google_sub = db.query(UserEntity).filter(UserEntity.google_sub == google_sub).first()
        if existing_by_google_sub:
            existing_by_google_sub.email = email
            existing_by_google_sub.email_verified = True
            existing_by_google_sub.auth_provider = 'google'
            db.commit()
            db.refresh(existing_by_google_sub)
            return _to_dict(existing_by_google_sub)

        existing_by_email = db.query(UserEntity).filter(UserEntity.email == email).first()
        if existing_by_email:
            existing_by_email.google_sub = google_sub
            existing_by_email.email_verified = True
            existing_by_email.auth_provider = 'google'
            db.commit()
            db.refresh(existing_by_email)
            return _to_dict(existing_by_email)

        username = base_username
        suffix = 1
        while db.query(UserEntity).filter(UserEntity.username == username).first():
            suffix += 1
            username = f"{base_username}{suffix}"

        new_user = UserEntity(
            username=username,
            email=email,
            google_sub=google_sub,
            auth_provider='google',
            hashed_password=get_password_hash(secrets.token_urlsafe(24)),
            is_admin=False,
            email_verified=True,
            credits=0,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return _to_dict(new_user)


def get_user_by_id(user_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        return _to_dict(user) if user else None


def update_user(user_id: int, *, username: str | None = None, email: str | None = None, password: str | None = None, role: str | None = None, email_verified: bool | None = None) -> Optional[dict]:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            return None

        # Validate username uniqueness
        if username and username != user.username:
            exists = db.query(UserEntity).filter(UserEntity.username == username).first()
            if exists:
                raise ValueError('Tên đăng nhập đã tồn tại')
            user.username = username

        # Validate email uniqueness
        if email and email != user.email:
            exists = db.query(UserEntity).filter(UserEntity.email == email).first()
            if exists:
                raise ValueError('Email đã tồn tại')
            user.email = email

        if password:
            user.hashed_password = get_password_hash(password)

        if role is not None:
            user.is_admin = True if role == 'admin' else False

        if email_verified is not None:
            user.email_verified = bool(email_verified)

        db.commit()
        db.refresh(user)
        return _to_dict(user)


def set_user_credits(user_id: int, credits: int) -> bool:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            return False
        user.credits = int(credits)
        db.commit()
        return True


def adjust_user_credits(user_id: int, delta: int) -> bool:
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            return False
        user.credits = max(0, int(user.credits or 0) + int(delta))
        db.commit()
        return True
