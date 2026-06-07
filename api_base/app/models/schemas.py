from pydantic import BaseModel, Field
from typing import List, Optional


class URLInput(BaseModel):
    url: str


class CleanedContent(BaseModel):
    title: str
    main_text: str
    source_url: str
    run_id: Optional[str] = None


class MasterScript(BaseModel):
    hook: str
    body: str
    call_to_action: str
    run_id: Optional[str] = None


class SceneData(BaseModel):
    scene_number: int
    duration: int
    voiceover: str
    visual_description: str
    run_id: Optional[str] = None
    technical_prompt: Optional[str] = None
    audio_path: Optional[str] = None
    video_path: Optional[str] = None


class LogEvent(BaseModel):
    timestamp: str
    user_id: str
    run_id: str
    step: str
    data: dict


class RunLogSummary(BaseModel):
    run_id: str
    date: str
    event_count: int
    first_timestamp: Optional[str] = None
    last_timestamp: Optional[str] = None
    steps: List[str] = Field(default_factory=list)


class RunLogDetail(RunLogSummary):
    events: List[LogEvent] = Field(default_factory=list)
