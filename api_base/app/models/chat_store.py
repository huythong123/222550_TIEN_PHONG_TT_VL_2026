import json
import logging
from typing import List, Optional

from app.db import SessionLocal
from app.models.chat_entity import ChatBlobEntity

logger = logging.getLogger(__name__)


def get_chats_for_user(user_id: int) -> List[dict]:
    try:
        with SessionLocal() as db:
            row = db.query(ChatBlobEntity).filter(ChatBlobEntity.user_id == int(user_id)).first()
            if not row or not row.chats_json:
                return []
            try:
                return json.loads(row.chats_json)
            except Exception:
                return []
    except Exception:
        logger.exception('Failed to read chats for user %s', user_id)
        return []


def set_chats_for_user(user_id: int, chats: List[dict]) -> None:
    try:
        raw = json.dumps(chats)
        with SessionLocal() as db:
            row = db.query(ChatBlobEntity).filter(ChatBlobEntity.user_id == int(user_id)).first()
            if not row:
                row = ChatBlobEntity(user_id=int(user_id), chats_json=raw)
                db.add(row)
            else:
                row.chats_json = raw
            db.commit()
    except Exception:
        logger.exception('Failed to save chats for user %s', user_id)
