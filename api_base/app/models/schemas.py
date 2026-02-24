from pydantic import BaseModel
from typing import List, Optional


class URLInput(BaseModel):
    """Đầu vào từ người dùng (Frontend)"""
    url: str


class CleanedContent(BaseModel):
    """Dữ liệu sau khi cào và làm sạch"""
    title: str
    main_text: str
    source_url: str


class MasterScript(BaseModel):
    """
    Kịch bản quảng cáo tổng thể sau khi AI viết.
    """
    hook: str
    body: str
    call_to_action: str


class SceneData(BaseModel):
    """
    Cấu trúc của một phân cảnh đơn lẻ.
    """
    scene_number: int
    duration: int
    voiceover: str
    visual_description: str
    image_prompt: Optional[str] = None
    technical_prompt: Optional[str] = None
    image_path: Optional[str] = None
    audio_path: Optional[str] = None
    video_path: Optional[str] = None
