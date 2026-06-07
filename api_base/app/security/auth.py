
from datetime import datetime, timedelta
from typing import Optional, Tuple
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

logger = logging.getLogger(__name__)

SECRET_KEY = "change-me-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Tuple[Optional[dict], Optional[str]]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload, None
    except JWTError as e:
        # Log the exact JWT error for debugging (expired, invalid signature, etc.)
        logger.warning("decode_access_token failed: %s", str(e))
        return None, str(e)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload, err = decode_access_token(token)
    if not payload:
        # Map common JWT errors to user-friendly messages, but keep logs detailed
        detail = "Không thể xác thực thông tin đăng nhập"
        if err:
            lower = err.lower()
            if "expired" in lower:
                detail = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            elif "signature" in lower or "invalid" in lower:
                detail = "Token không hợp lệ. Vui lòng đăng nhập lại."
        logger.info("Authentication failed: %s", err)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
    return payload
