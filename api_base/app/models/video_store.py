from typing import Optional, List

from app.db import SessionLocal
from app.models.video_entity import VideoEntity
from app.models.video_scene_entity import VideoSceneEntity


def create_video(user_id: int, title: str | None = None, description: str | None = None) -> dict:
    with SessionLocal() as db:
        v = VideoEntity(user_id=user_id, title=title, description=description)
        db.add(v)
        db.commit()
        db.refresh(v)
        return {
            'id': v.id,
            'user_id': v.user_id,
            'title': v.title,
            'description': v.description,
            'final_path': v.final_path,
            'status': v.status,
            'created_at': v.created_at.isoformat(),
        }


def list_videos(limit: int = 100, offset: int = 0, user_id: int | None = None) -> List[dict]:
    with SessionLocal() as db:
        q = db.query(VideoEntity)
        if user_id is not None:
            q = q.filter(VideoEntity.user_id == user_id)
        rows = q.order_by(VideoEntity.id.desc()).offset(offset).limit(limit).all()
        return [
            {
                'id': r.id,
                'user_id': r.user_id,
                'title': r.title,
                'description': r.description,
                'final_path': r.final_path,
                'status': r.status,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]


def get_video(video_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        v = db.query(VideoEntity).filter(VideoEntity.id == video_id).first()
        if not v:
            return None
        return {
            'id': v.id,
            'user_id': v.user_id,
            'title': v.title,
            'description': v.description,
            'final_path': v.final_path,
            'status': v.status,
            'created_at': v.created_at.isoformat(),
        }


def list_video_scenes(video_id: int) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(VideoSceneEntity).filter(VideoSceneEntity.video_id == video_id).order_by(VideoSceneEntity.scene_number.asc()).all()
        return [
            {
                'id': r.id,
                'video_id': r.video_id,
                'scene_number': r.scene_number,
                'visual_description': r.visual_description,
                'technical_prompt': r.technical_prompt,
                'audio_path': r.audio_path,
                'video_path': r.video_path,
            }
            for r in rows
        ]
