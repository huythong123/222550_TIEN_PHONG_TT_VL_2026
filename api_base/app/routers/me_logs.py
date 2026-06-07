from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException

from app.security.auth import get_current_user
from app.services.render_storage_service import list_user_run_logs, get_user_run_log
from app.models.schemas import RunLogSummary, RunLogDetail


router = APIRouter()


def _resolve_user_identity(payload: dict[str, Any]) -> Any:
    try:
        return int(payload.get('sub'))
    except Exception:
        return payload.get('sub')


@router.get('/logs', response_model=List[RunLogSummary])
async def api_my_logs(payload=Depends(get_current_user)):
    user_id = _resolve_user_identity(payload)
    runs = list_user_run_logs(user_id)
    if not runs and payload.get('username'):
        runs = list_user_run_logs(payload.get('username'))
    return runs or []


@router.get('/logs/{run_id}', response_model=RunLogDetail)
async def api_my_log_detail(run_id: str, payload=Depends(get_current_user)):
    user_id = _resolve_user_identity(payload)
    detail = get_user_run_log(user_id, run_id)
    if not detail and payload.get('username'):
        detail = get_user_run_log(payload.get('username'), run_id)
    if not detail:
        raise HTTPException(status_code=404, detail='Không tìm thấy log')
    return detail
