from typing import List, Optional
from app.db import SessionLocal
from app.models.prompt_log_entity import PromptLogEntity


def create_prompt_log(user_id: Optional[int], video_id: Optional[int], prompt_type: str, prompt_content: Optional[str], ai_response: Optional[str]) -> dict:
    with SessionLocal() as db:
        e = PromptLogEntity(user_id=user_id, video_id=video_id, prompt_type=prompt_type, prompt_content=prompt_content, ai_response=ai_response)
        db.add(e)
        db.commit()
        db.refresh(e)
        return {
            'id': e.id,
            'user_id': e.user_id,
            'video_id': e.video_id,
            'prompt_type': e.prompt_type,
            'prompt_content': e.prompt_content,
            'ai_response': e.ai_response,
            'created_at': e.created_at.isoformat(),
        }


def list_prompt_logs(limit: int = 100, offset: int = 0) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(PromptLogEntity).order_by(PromptLogEntity.id.desc()).offset(offset).limit(limit).all()
        return [
            {
                'id': r.id,
                'user_id': r.user_id,
                'video_id': r.video_id,
                'prompt_type': r.prompt_type,
                'prompt_content': r.prompt_content,
                'ai_response': r.ai_response,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
