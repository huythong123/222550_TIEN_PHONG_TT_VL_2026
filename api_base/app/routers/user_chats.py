from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.security.auth import get_current_user
from app.models.chat_store import get_chats_for_user, set_chats_for_user

router = APIRouter()


@router.get('/chats', summary='Get my saved chats')
async def get_my_chats(user=Depends(get_current_user)) -> List[dict]:
    try:
        user_id = int(user.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid user')
    return get_chats_for_user(user_id)


@router.post('/chats', summary='Save my chats')
async def save_my_chats(payload: List[dict], user=Depends(get_current_user)):
    try:
        user_id = int(user.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid user')
    try:
        set_chats_for_user(user_id, payload)
        return {'status': 'ok'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
