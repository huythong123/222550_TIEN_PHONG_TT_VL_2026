from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class VideoSceneEntity(Base):
    __tablename__ = "video_scenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey('videos.id'), nullable=False, index=True)
    scene_number: Mapped[int] = mapped_column(Integer, nullable=False)
    visual_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    video_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
