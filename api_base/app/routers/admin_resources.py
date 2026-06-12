from fastapi import APIRouter, Depends, HTTPException
from typing import List

from pydantic import BaseModel

from app.security.auth import get_current_user
from app.models.package_store import list_packages, create_package, get_package, update_package, delete_package
from app.models.transaction_store import list_transactions, create_transaction
from app.models.video_store import list_videos, get_video, list_video_scenes, create_video
from app.models.settings_store import list_settings, get_setting, set_setting
from app.models.login_store import list_login_logs
from app.config import settings
from app.models.admin_store import add_admin_log
import json

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
    # Return DB settings, but ensure common API keys in environment appear as well
    rows = list_settings()

    # Descriptions for common integration keys (shown when description is empty)
    descriptions_map = {
        'OPENAI_API_KEY': 'OpenAI API key used for prompt/enhancement generation (GPT). Save here to let the app call OpenAI without editing .env. Changing here writes to DB only.',
        'KLING_API_KEY': 'Kling secret key (used to sign JWT for Kling submission). Keep secret. Changing here writes to DB only.',
        'KLING_ACCESS_KEY': 'Kling access key (public identifier). Required to generate JWT for Kling API.',
        'SEPAY_API_KEY': 'SePay payment gateway API key for bank transfer verification.',
    }

    existing_keys = {r['key'] for r in rows}

    # If a DB row exists but has no description, fill a helpful default from descriptions_map
    for r in rows:
        k = r.get('key')
        if k in descriptions_map and (not r.get('description')):
            r['description'] = descriptions_map[k]

    # Ensure common keys from environment are visible in admin UI even if not stored in DB
    fallback_keys = list(descriptions_map.keys())
    for k in fallback_keys:
        if k not in existing_keys:
            val = getattr(settings, k, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                continue
            rows.append({
                'id': None,
                'key': k,
                'value': str(val),
                'description': descriptions_map.get(k, 'From environment (.env) - edit to store in DB'),
            })

    return rows


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
    # record previous value for audit
    prev = get_setting(payload.key)
    try:
        result = set_setting(payload.key, payload.value, payload.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # update in-memory settings object so parts of the app that read from settings use new value
    try:
        if hasattr(settings, payload.key):
            try:
                setattr(settings, payload.key, payload.value)
            except Exception:
                # ignore if cannot set on settings instance
                pass
    except Exception:
        pass

    # log admin action including old and new values (store as JSON details)
    try:
        admin_id = None
        try:
            admin_id = int(admin.get('sub'))
        except Exception:
            admin_id = None

        details = {
            'setting_key': payload.key,
            'old_value': prev.get('value') if prev else None,
            'new_value': payload.value,
            'description': payload.description,
        }
        # Use admin_id if available, otherwise leave as None
        try:
            add_admin_log(admin_id or 0, 'update_setting', None, json.dumps(details))
        except Exception as e:
            # Log the exception so admins can diagnose why audit records fail to persist
            import logging
            logging.exception('Failed to add admin log for setting change: %s', str(e))
    except Exception:
        pass

    return result
