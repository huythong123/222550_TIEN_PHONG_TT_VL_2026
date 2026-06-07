from fastapi import APIRouter, Depends, HTTPException
from typing import Any

from app.security.auth import get_current_user
from app.models.admin_stats import get_dashboard_stats, list_recent_activities, list_recent_users

router = APIRouter()


def require_admin(payload=Depends(get_current_user)):
    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Bạn không có quyền quản trị')
    return payload


@router.get('/dashboard')
async def api_dashboard(admin=Depends(require_admin)) -> Any:
    return get_dashboard_stats()


@router.get('/recent-activities')
async def api_recent_activities(admin=Depends(require_admin)) -> Any:
    return list_recent_activities()


@router.get('/recent-users')
async def api_recent_users(admin=Depends(require_admin)) -> Any:
    return list_recent_users()
