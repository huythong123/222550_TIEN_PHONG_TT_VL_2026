from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PromptLogEntity(Base):
    __tablename__ = 'prompt_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    video_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    prompt_type: Mapped[str] = mapped_column(String(50), nullable=False)
    prompt_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
