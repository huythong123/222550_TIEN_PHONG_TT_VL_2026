from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from pathlib import Path

from app.models.user_models import UserCreate, UserOut
from app.models.user_store import list_users, create_user, delete_user, set_user_credits, adjust_user_credits, get_user_by_id
from app.models.user_models import UserCreate, UserOut
from app.models.user_models import UserUpdate
from app.models.user_store import update_user
from pydantic import BaseModel
from app.models.admin_store import add_admin_log, list_admin_logs, get_admin_log, list_admin_logs_for_user
from app.models.schemas import RunLogDetail, RunLogSummary
from app.services.render_storage_service import delete_user_run_log, get_user_run_log, list_user_run_logs
from app.security.auth import get_current_user
from app.models.transaction_store import create_transaction
from datetime import datetime
from fastapi.responses import FileResponse
from pathlib import Path
from app.services import render_storage_service
from app.db import SessionLocal
from app.models.video_entity import VideoEntity
from app.models.user_entity import UserEntity
from app.models.credit_transaction_entity import CreditTransactionEntity
from app.models.activity_log_entity import ActivityLogEntity
from app.models.login_log_entity import LoginLogEntity
import secrets
from app.security.auth import get_password_hash

router = APIRouter()


def _path_to_web_url(raw_path: Any) -> str | None:
    if not raw_path:
        return None

    url = str(raw_path).replace('\\', '/')
    if url.startswith('http://') or url.startswith('https://'):
        return url

    try:
        resolved = Path(url).resolve()
    except Exception:
        resolved = None

    if resolved:
        try:
            api_root = Path(render_storage_service.RENDER_ROOT).resolve()
            rel = resolved.relative_to(api_root)
            return f"/renders/{rel.as_posix()}"
        except Exception:
            pass

        try:
            workspace_renders = Path.cwd().parent.resolve() / 'storage' / 'renders'
            rel2 = resolved.relative_to(workspace_renders.resolve())
            return f"/storage/renders/{rel2.as_posix()}"
        except Exception:
            pass

    if url.startswith('/renders/') or url.startswith('/storage/renders/'):
        return url

    return None


def _run_videos_from_log(user_id: int, run_id: str) -> list[dict[str, Any]]:
    log_detail = get_user_run_log(user_id, run_id)
    if not log_detail:
        user = get_user_by_id(user_id)
        if user and user.get('username'):
            log_detail = get_user_run_log(user.get('username'), run_id)
    if not log_detail:
        return []

    items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for ev in log_detail.get('events') or []:
        step = ev.get('step') or 'unknown'
        data = ev.get('data') or {}

        candidates: list[tuple[str, str | None]] = []
        if step == 'step6-video' and data.get('video_dir'):
            video_dir = Path(str(data.get('video_dir')))
            if video_dir.exists():
                for mp4 in sorted(video_dir.glob('*.mp4'), key=lambda p: p.stat().st_mtime, reverse=True):
                    candidates.append((str(mp4), mp4.name))

        for key in ('final_video_path', 'video_url', 'video_path'):
            if data.get(key):
                candidates.append((str(data.get(key)), data.get('tvc_title') or data.get('title')))

        for raw_path, title in candidates:
            web_url = _path_to_web_url(raw_path)
            if not web_url or web_url in seen_urls:
                continue
            seen_urls.add(web_url)
            items.append({
                'step': step,
                'title': title or Path(str(raw_path)).name,
                'timestamp': ev.get('timestamp'),
                'url': web_url,
                'raw_path': raw_path,
            })

    return items


def require_admin(payload=Depends(get_current_user)):
    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Bạn không có quyền quản trị')
    return payload


@router.get('/users', response_model=List[UserOut])
async def api_list_users(admin=Depends(require_admin)):
    users = list_users()
    return [
        {
            'id': u['id'],
            'username': u.get('username'),
            'email': u.get('email'),
            'role': u.get('role', 'user'),
            'email_verified': u.get('email_verified', False),
        }
        for u in users
    ]


@router.post('/users', response_model=UserOut)
async def api_create_user(payload: UserCreate, admin=Depends(require_admin)):
    try:
        u = create_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        add_admin_log(admin['sub'] and int(admin['sub']) or admin.get('sub'), 'create_user', target_user_id=u['id'], details=f"created user {u.get('username')}")
    except Exception:
        pass

    return {
        'id': u['id'],
        'username': u.get('username'),
        'email': u.get('email'),
        'role': u.get('role', 'user'),
    }


@router.delete('/users/{user_id}')
async def api_delete_user(user_id: int, admin=Depends(require_admin)):
    ok = delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    try:
        add_admin_log(admin['sub'] and int(admin['sub']) or admin.get('sub'), 'delete_user', target_user_id=user_id, details=f"deleted user {user_id}")
    except Exception:
        pass
    return { 'status': 'deleted' }


class CreditsPayload(BaseModel):
    credits: int


@router.post('/users/{user_id}/credits')
async def api_set_user_credits(user_id: int, payload: CreditsPayload, admin=Depends(require_admin)):
    ok = set_user_credits(user_id, payload.credits)
    if not ok:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    try:
        add_admin_log(admin['sub'] and int(admin['sub']) or admin.get('sub'), 'set_credits', target_user_id=user_id, details=str(payload.credits))
    except Exception:
        pass
    return { 'status': 'ok', 'user_id': user_id, 'credits': payload.credits }


class CreditsDelta(BaseModel):
    delta: int


@router.patch('/users/{user_id}/credits')
async def api_adjust_user_credits(user_id: int, payload: CreditsDelta, admin=Depends(require_admin)):
    ok = adjust_user_credits(user_id, payload.delta)
    if not ok:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    user = get_user_by_id(user_id)
    try:
        add_admin_log(admin['sub'] and int(admin['sub']) or admin.get('sub'), 'adjust_credits', target_user_id=user_id, details=str(payload.delta))
    except Exception:
        pass
    return { 'status': 'ok', 'user_id': user_id, 'credits': user.get('credits', 0) }


@router.get('/users/{user_id}')
async def api_get_user(user_id: int, admin=Depends(require_admin)):
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


@router.put('/users/{user_id}', response_model=UserOut)
async def api_update_user(user_id: int, payload: UserUpdate, admin=Depends(require_admin)):
    try:
        u = update_user(user_id, username=payload.username, email=payload.email, password=payload.password, role=payload.role, email_verified=payload.email_verified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not u:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    try:
        add_admin_log(admin['sub'] and int(admin['sub']) or admin.get('sub'), 'update_user', target_user_id=user_id, details=f"updated user {u.get('username')}")
    except Exception:
        pass
    return {
        'id': u['id'],
        'username': u.get('username'),
        'email': u.get('email'),
        'role': u.get('role', 'user'),
        'email_verified': u.get('email_verified', False),
    }


@router.get('/logs')
async def api_list_admin_logs(limit: int = 100, offset: int = 0, admin=Depends(require_admin)):
    return list_admin_logs(limit=limit, offset=offset)


@router.get('/logs/{log_id}')
async def api_get_admin_log(log_id: int, admin=Depends(require_admin)):
    log = get_admin_log(log_id)
    if not log:
        raise HTTPException(status_code=404, detail='Không tìm thấy log')
    return log


@router.get('/users/{user_id}/admin-logs')
async def api_get_user_admin_logs(user_id: int, limit: int = 100, offset: int = 0, admin=Depends(require_admin)):
    return list_admin_logs_for_user(user_id, limit=limit, offset=offset)


@router.get('/users/{user_id}/logs', response_model=List[RunLogSummary])
async def api_list_user_logs(user_id: int, admin=Depends(require_admin)):
    # The render storage may use either numeric user ids (user_1) or username-based folders (user_admin).
    # Try numeric id first, then fall back to username if present.
    runs = list_user_run_logs(user_id)
    if runs:
        return runs

    # Fallback: look up user and try by username
    user = get_user_by_id(user_id)
    if user and user.get('username'):
        runs = list_user_run_logs(user.get('username'))
    return runs


@router.get('/users/{user_id}/logs/{run_id}', response_model=RunLogDetail)
async def api_get_user_log(user_id: int, run_id: str, admin=Depends(require_admin)):
    log_detail = get_user_run_log(user_id, run_id)
    if not log_detail:
        user = get_user_by_id(user_id)
        if user and user.get('username'):
            log_detail = get_user_run_log(user.get('username'), run_id)
    if not log_detail:
        raise HTTPException(status_code=404, detail='Không tìm thấy log của run này')
    return log_detail


@router.get('/users/{user_id}/runs/{run_id}/videos')
async def api_get_user_run_videos(user_id: int, run_id: str, admin=Depends(require_admin)):
    return _run_videos_from_log(user_id, run_id)


@router.delete('/users/{user_id}/logs/{run_id}')
async def api_delete_user_log(user_id: int, run_id: str, admin=Depends(require_admin)):
    ok = delete_user_run_log(user_id, run_id)
    if not ok:
        user = get_user_by_id(user_id)
        if user and user.get('username'):
            ok = delete_user_run_log(user.get('username'), run_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Không tìm thấy log của run này')
    return { 'status': 'deleted' }


@router.post('/users/{user_id}/runs/{run_id}/refund')
async def api_refund_run(user_id: int, run_id: str, admin=Depends(require_admin)):
    """Refund credits for a given run. Creates a transaction, adjusts user credits, and appends admin log and run event."""
    # Verify run exists
    log_detail = get_user_run_log(user_id, run_id)
    if not log_detail:
        # fallback to username-based runs
        user = get_user_by_id(user_id)
        if user and user.get('username'):
            log_detail = get_user_run_log(user.get('username'), run_id)
    if not log_detail:
        raise HTTPException(status_code=404, detail='Không tìm thấy run để hoàn tiền')

    # Check if already refunded (search events for refund markers)
    events = log_detail.get('events') or []
    for ev in events:
        step = ev.get('step')
        data = ev.get('data') or {}
        if step in ('admin_refund', 'refund') or data.get('refunded'):
            raise HTTPException(status_code=400, detail='Run đã được hoàn tiền trước đó')

    # Compute refundable amount: sum of deducted credits events for this run
    refunded_amount = 0
    for ev in events:
        if ev.get('step') == 'credits' and isinstance(ev.get('data'), dict):
            d = ev.get('data')
            if 'deducted' in d:
                try:
                    refunded_amount += int(d.get('deducted') or 0)
                except Exception:
                    pass

    if refunded_amount <= 0:
        raise HTTPException(status_code=400, detail='Không có khoản credits nào để hoàn cho run này')

    # Perform refund: create transaction and adjust user's credits
    try:
        admin_id = admin.get('sub') and int(admin.get('sub')) or admin.get('username')
        # create transaction (positive delta for refund)
        create_transaction(int(user_id), int(refunded_amount), reason=f"refund run {run_id}", created_by=str(admin_id))
        # adjust credits
        adjust_user_credits(int(user_id), int(refunded_amount))
        # append run log marking refund
        from app.services.render_storage_service import append_run_log
        append_run_log(user_id, run_id, 'admin_refund', {
            'refunded': int(refunded_amount),
            'refunded_by': admin_id,
            'refunded_at': datetime.now().isoformat(),
        })
        # add admin DB log
        try:
            add_admin_log(admin_id and int(admin_id) or None, 'refund_run', target_user_id=int(user_id), details=f'refunded {refunded_amount} for run {run_id}')
        except Exception:
            pass

        user = get_user_by_id(int(user_id))
        return {'status': 'ok', 'refunded': int(refunded_amount), 'credits': user.get('credits', 0)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get('/users/{user_id}/runs/{run_id}/download')
async def api_download_run(user_id: int, run_id: str, admin=Depends(require_admin)):
    """Return the newest MP4 file from the run's final folder as a FileResponse."""
    # get run meta to determine date
    log = get_user_run_log(user_id, run_id)
    if not log:
        user = get_user_by_id(user_id)
        if user and user.get('username'):
            log = get_user_run_log(user.get('username'), run_id)
    if not log:
        raise HTTPException(status_code=404, detail='Run not found')

    date = log.get('date')
    user_part = f"user_{user_id}"
    run_final_dir = Path(render_storage_service.RENDER_ROOT) / user_part / date / run_id / 'final'
    if not run_final_dir.exists():
        raise HTTPException(status_code=404, detail='No final folder for this run')

    mp4s = sorted([p for p in run_final_dir.glob('*.mp4')], key=lambda p: p.stat().st_mtime, reverse=True)
    if not mp4s:
        raise HTTPException(status_code=404, detail='No mp4 file found for this run')

    file_path = mp4s[0]
    # log admin download
    try:
        add_admin_log(admin.get('sub') and int(admin.get('sub')) or None, 'download_run', target_user_id=int(user_id), details=f'downloaded {file_path.name} from run {run_id}')
    except Exception:
        pass

    return FileResponse(path=str(file_path), filename=file_path.name, media_type='video/mp4')


class RegisterRunPayload(BaseModel):
    tvc_title: str | None = None
    final_video_path: str | None = None


@router.post('/users/{user_id}/runs/{run_id}/register')
async def api_register_run(user_id: int, run_id: str, payload: RegisterRunPayload, admin=Depends(require_admin)):
    """Register a direct merge/run into the run events (useful for offline merges).

    Appends a 'step7-merge' event with provided final_video_path and tvc_title.
    """
    # ensure run dir exists (create if necessary)
    try:
        # create_or_get_run will ensure directory exists
        from app.services.render_storage_service import create_or_get_run, append_run_log
        _, run_dir = create_or_get_run(user_id, run_id)
        append_run_log(user_id, run_id, 'step7-merge', {
            'tvc_title': payload.tvc_title,
            'final_video_path': payload.final_video_path,
            'registered_by': admin.get('sub') or admin.get('username'),
        })
        try:
            add_admin_log(admin.get('sub') and int(admin.get('sub')) or None, 'register_run', target_user_id=int(user_id), details=f'registered run {run_id}')
        except Exception:
            pass
        return {'status': 'ok'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/users/{user_id}/details')
async def api_user_details(user_id: int, admin=Depends(require_admin)):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    # compute stats
    with SessionLocal() as db:
        total_videos = db.query(VideoEntity).filter(VideoEntity.user_id == user_id).count()
        # sum transactions
        pos = db.query(CreditTransactionEntity).filter(CreditTransactionEntity.user_id == user_id, CreditTransactionEntity.delta > 0).all()
        neg = db.query(CreditTransactionEntity).filter(CreditTransactionEntity.user_id == user_id, CreditTransactionEntity.delta < 0).all()
        credits_bought = sum([p.delta for p in pos])
        credits_used = -sum([n.delta for n in neg])
        # last login
        last_login_row = db.query(LoginLogEntity).filter(LoginLogEntity.user_id == user_id).order_by(LoginLogEntity.id.desc()).first()
        last_login = last_login_row.created_at.isoformat() if last_login_row else None

    return {
        'id': user['id'],
        'username': user.get('username'),
        'email': user.get('email'),
        'role': user.get('role'),
        'credits': user.get('credits', 0),
        'total_videos': int(total_videos),
        'credits_bought': int(credits_bought),
        'credits_used': int(credits_used),
        'created_at': user.get('created_at') if 'created_at' in user else None,
        'last_login': last_login,
    }


@router.get('/users/{user_id}/activities')
async def api_user_activities(user_id: int, limit: int = 50, offset: int = 0, admin=Depends(require_admin)):
    # Return activity logs for a specific user
    with SessionLocal() as db:
        rows = db.query(ActivityLogEntity).filter(ActivityLogEntity.user_id == user_id).order_by(ActivityLogEntity.id.desc()).offset(offset).limit(limit).all()
        items = [
            {
                'id': r.id,
                'action': r.action,
                'detail': r.detail,
                'ip_address': r.ip_address,
                'user_agent': r.user_agent,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
    return items


class BanPayload(BaseModel):
    reason: str | None = None


@router.post('/users/{user_id}/ban')
async def api_ban_user(user_id: int, payload: BanPayload, admin=Depends(require_admin)):
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        user.is_banned = True
        user.ban_reason = payload.reason
        db.commit()
    try:
        add_admin_log(admin.get('sub') and int(admin.get('sub')) or None, 'ban_user', target_user_id=int(user_id), details=payload.reason)
    except Exception:
        pass
    return {'status': 'banned'}


@router.post('/users/{user_id}/unban')
async def api_unban_user(user_id: int, admin=Depends(require_admin)):
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        user.is_banned = False
        user.ban_reason = None
        db.commit()
    try:
        add_admin_log(admin.get('sub') and int(admin.get('sub')) or None, 'unban_user', target_user_id=int(user_id), details='unbanned')
    except Exception:
        pass
    return {'status': 'unbanned'}


@router.post('/users/{user_id}/reset-password')
async def api_reset_user_password(user_id: int, admin=Depends(require_admin)):
    # generate a temporary password and set it for the user
    tmp = secrets.token_urlsafe(10)
    hashed = get_password_hash(tmp)
    with SessionLocal() as db:
        user = db.query(UserEntity).filter(UserEntity.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        user.hashed_password = hashed
        db.commit()
    try:
        add_admin_log(admin.get('sub') and int(admin.get('sub')) or None, 'reset_password', target_user_id=int(user_id), details='password reset by admin')
    except Exception:
        pass
    return {'status': 'ok', 'temporary_password': tmp}
