from fastapi import APIRouter, Depends, HTTPException
from typing import List

from pydantic import BaseModel

from app.security.auth import get_current_user
from app.models.package_store import list_packages, create_package, get_package, update_package, delete_package
from app.models.transaction_store import list_transactions, create_transaction
from app.models.video_store import list_videos, get_video, list_video_scenes, create_video
from app.models.settings_store import list_settings, get_setting, set_setting
from app.models.login_store import list_login_logs

router = APIRouter()


def require_admin(payload=Depends(get_current_user)):
    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Bạn không có quyền quản trị')
    return payload


class PackageIn(BaseModel):
    name: str
    credits: int
    price_cents: int
    description: str | None = None


@router.get('/packages')
async def api_list_packages(admin=Depends(require_admin)):
    return list_packages()


@router.post('/packages')
async def api_create_package(payload: PackageIn, admin=Depends(require_admin)):
    return create_package(payload.name, payload.credits, payload.price_cents, payload.description)


@router.get('/packages/{package_id}')
async def api_get_package(package_id: int, admin=Depends(require_admin)):
    p = get_package(package_id)
    if not p:
        raise HTTPException(status_code=404, detail='Không tìm thấy gói')
    return p


@router.put('/packages/{package_id}')
async def api_update_package(package_id: int, payload: PackageIn, admin=Depends(require_admin)):
    p = update_package(package_id, payload.name, payload.credits, payload.price_cents, payload.description)
    if not p:
        raise HTTPException(status_code=404, detail='Không tìm thấy gói')
    return p


@router.delete('/packages/{package_id}')
async def api_delete_package(package_id: int, admin=Depends(require_admin)):
    ok = delete_package(package_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Không tìm thấy gói')
    return {'deleted': True}


@router.get('/transactions')
async def api_list_transactions(limit: int = 100, offset: int = 0, admin=Depends(require_admin)):
    return list_transactions(limit=limit, offset=offset)


class TransactionIn(BaseModel):
    user_id: int
    delta: int
    reason: str | None = None


@router.post('/transactions')
async def api_create_transaction(payload: TransactionIn, admin=Depends(require_admin)):
    created_by = admin.get('sub') and str(admin.get('sub')) or admin.get('username')
    return create_transaction(payload.user_id, payload.delta, payload.reason, created_by=created_by)


@router.get('/videos')
async def api_list_videos(limit: int = 100, offset: int = 0, user_id: int | None = None, admin=Depends(require_admin)):
    return list_videos(limit=limit, offset=offset, user_id=user_id)


@router.get('/login-logs')
async def api_list_login_logs(limit: int = 100, offset: int = 0, admin=Depends(require_admin)):
    return list_login_logs(limit=limit, offset=offset)


@router.get('/videos/{video_id}')
async def api_get_video(video_id: int, admin=Depends(require_admin)):
    v = get_video(video_id)
    if not v:
        raise HTTPException(status_code=404, detail='Không tìm thấy video')
    return v





@router.get('/videos/{video_id}/scenes')
async def api_list_video_scenes(video_id: int, admin=Depends(require_admin)):
    return list_video_scenes(video_id)


@router.get('/settings')
async def api_list_settings(admin=Depends(require_admin)):
    return list_settings()


class SettingIn(BaseModel):
    key: str
    value: str
    description: str | None = None


@router.get('/settings/{key}')
async def api_get_setting(key: str, admin=Depends(require_admin)):
    s = get_setting(key)
    if not s:
        raise HTTPException(status_code=404, detail='Không tìm thấy setting')
    return s


@router.post('/settings')
async def api_set_setting(payload: SettingIn, admin=Depends(require_admin)):
    return set_setting(payload.key, payload.value, payload.description)
