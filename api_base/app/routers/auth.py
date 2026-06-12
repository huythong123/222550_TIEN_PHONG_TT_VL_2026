from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.utils.settings_helper import get_db_setting
from app.models.user_store import (
    find_user_by_username_or_email,
    find_or_create_google_user,
    get_user_by_id,
    update_user,
    adjust_user_credits,
)
from app.security.auth import create_access_token, verify_password, get_current_user
from app.models.login_store import create_login_log
from app.models.payment_store import create_payment, encode_payment_id

router = APIRouter()
GOOGLE_SCOPES = 'openid email profile'


class LoginIn(BaseModel):
    identifier: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str | None = None
    new_password: str


def _build_token_payload(user: dict) -> dict:
    return {
        'sub': str(user.get('id')),
        'username': user.get('username'),
        'is_admin': user.get('is_admin', False),
        'role': 'admin' if user.get('is_admin', False) else 'user',
        'credits': user.get('credits', 0),
    }


def _frontend_redirect_url(**params: str) -> str:
    base = settings.FRONTEND_URL.rstrip('/') + '/'
    query = urlencode(params)
    return f"{base}?{query}" if query else base


@router.post('/token')
async def login_for_token(data: LoginIn, request: Request):
    user = find_user_by_username_or_email(data.identifier)
    ip = None
    ua = None
    try:
        ip = request.client.host if request and request.client else None
    except Exception:
        ip = None
    try:
        ua = request.headers.get('user-agent')
    except Exception:
        ua = None

    if not user:
        try:
            create_login_log(None, ip, ua, None, False)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail='Sai tài khoản hoặc mật khẩu')

    if not verify_password(data.password, user.get('hashed_password')):
        try:
            create_login_log(user.get('id'), ip, ua, None, False)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail='Sai tài khoản hoặc mật khẩu')

    token = create_access_token(_build_token_payload(user))
    try:
        create_login_log(user.get('id'), ip, ua, None, True)
    except Exception:
        pass
    return {'access_token': token, 'token_type': 'bearer'}


@router.post('/change-password')
async def change_password(data: ChangePasswordIn, payload=Depends(get_current_user)):
    try:
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Không lấy được thông tin user')

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')

    new_password = (data.new_password or '').strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail='Mật khẩu mới phải có ít nhất 6 ký tự')

    current_password = (data.current_password or '').strip()
    if user.get('auth_provider') != 'google':
        if not current_password or not verify_password(current_password, user.get('hashed_password') or ''):
            raise HTTPException(status_code=400, detail='Mật khẩu hiện tại không đúng')

    update_user(user_id, password=new_password)
    return {'message': 'Đổi mật khẩu thành công'}


@router.get('/google/login')
async def google_login():
    gid = get_db_setting('GOOGLE_CLIENT_ID')
    gsecret = get_db_setting('GOOGLE_CLIENT_SECRET')
    guri = get_db_setting('GOOGLE_REDIRECT_URI')
    if not gid or not gsecret:
        raise HTTPException(status_code=500, detail='Thiếu cấu hình Google OAuth ở backend')

    params = {
        'client_id': gid,
        'redirect_uri': guri,
        'response_type': 'code',
        'scope': GOOGLE_SCOPES,
        'access_type': 'offline',
        'prompt': 'consent',
    }
    auth_url = f"{settings.GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=302)


@router.get('/google/callback')
async def google_callback(code: str | None = None, error: str | None = None):
    if error:
        return RedirectResponse(
            url=_frontend_redirect_url(error='Đăng nhập Google bị huỷ hoặc thất bại'),
            status_code=302,
        )

    if not code:
        return RedirectResponse(url=_frontend_redirect_url(error='Google không trả về mã xác thực'), status_code=302)

    gid = get_db_setting('GOOGLE_CLIENT_ID')
    gsecret = get_db_setting('GOOGLE_CLIENT_SECRET')
    guri = get_db_setting('GOOGLE_REDIRECT_URI')
    if not gid or not gsecret:
        return RedirectResponse(url=_frontend_redirect_url(error='Thiếu cấu hình Google OAuth ở backend'), status_code=302)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(
                settings.GOOGLE_TOKEN_URL,
                data={
                    'code': code,
                    'client_id': gid,
                    'client_secret': gsecret,
                    'redirect_uri': guri,
                    'grant_type': 'authorization_code',
                },
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
            google_access_token = token_payload.get('access_token')
            if not google_access_token:
                return RedirectResponse(
                    url=_frontend_redirect_url(error='Không lấy được access token từ Google'),
                    status_code=302,
                )

            userinfo_response = await client.get(
                settings.GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {google_access_token}'},
            )
            userinfo_response.raise_for_status()
            profile = userinfo_response.json()
    except httpx.HTTPError:
        return RedirectResponse(url=_frontend_redirect_url(error='Không thể kết nối Google OAuth'), status_code=302)

    email = str(profile.get('email') or '').strip().lower()
    google_sub = str(profile.get('sub') or '').strip()
    email_verified = bool(profile.get('email_verified'))

    if not email or not google_sub:
        return RedirectResponse(url=_frontend_redirect_url(error='Google không trả về đủ thông tin tài khoản'), status_code=302)

    if not email_verified:
        return RedirectResponse(url=_frontend_redirect_url(error='Email Google chưa được xác thực'), status_code=302)

    user = find_or_create_google_user(
        email=email,
        google_sub=google_sub,
        full_name=(profile.get('name') or '').strip() or None,
    )
    token = create_access_token(_build_token_payload(user))
    return RedirectResponse(url=_frontend_redirect_url(token=token), status_code=302)


@router.get('/me')
async def api_me(payload=Depends(get_current_user)):
    try:
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Không lấy được thông tin user')

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')

    return {
        'id': user['id'],
        'username': user.get('username'),
        'email': user.get('email'),
        'role': user.get('role', 'user'),
        'email_verified': user.get('email_verified', False),
        'credits': user.get('credits', 0),
    }


class BuyCreditsIn(BaseModel):
    # amount in USD (dollars). Server will convert to credits using CREDITS_PER_DOLLAR
    amount: float


@router.post('/buy_credits')
async def api_buy_credits(payload: BuyCreditsIn, user=Depends(get_current_user)):
    # Create a pending payment record and return a hex id for the frontend
    # to show as transfer content / QR. The frontend should poll the
    # payment status endpoint to detect completion.
    try:
        user_id = int(user.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Không lấy được thông tin user')

    dollars = float(payload.amount or 0)
    if dollars <= 0:
        raise HTTPException(status_code=400, detail='Số tiền phải lớn hơn 0')

    # Convert dollars -> amount_vnd then compute credits using VND-based formula (2000 VND -> 30 credits)
    rate = getattr(settings, 'USD_TO_VND', 24000)
    amount_vnd = int(round(dollars * rate))
    try:
        credits = int(round((float(amount_vnd) / 2000.0) * 30.0))
    except Exception:
        credits = 0
    if credits <= 0:
        raise HTTPException(status_code=400, detail='Số tiền không đủ để đổi sang credits')

    p = create_payment(user_id=user_id, amount_usd=dollars, amount_vnd=amount_vnd, credits=credits, expire_minutes=getattr(settings, 'PAYMENT_EXPIRE_MINUTES', 60))
    hex_id = encode_payment_id(p['id'])
    qr_text = f"{getattr(settings, 'NAME_WEB', settings.APP_NAME)}NAPTOKEN{hex_id}"

    return {'status': 'pending', 'hex_id': hex_id, 'amount_vnd': amount_vnd, 'qr_text': qr_text}


