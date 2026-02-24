import json
import logging
from typing import List
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import MasterScript, SceneData

logger = logging.getLogger(__name__)

class SceneService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    async def split_into_scenes(self, master_script: MasterScript) -> List[SceneData]:
        """
        Chia kịch bản thành 4–6 phân cảnh.
        """

        logger.info("Đang chia cảnh từ hook/body/CTA...")

        script_text = f"""
HOOK:
{master_script.hook}

BODY:
{master_script.body}

CALL TO ACTION:
{master_script.call_to_action}
"""

        prompt = f"""
Bạn là Đạo diễn hình ảnh.
Hãy chia kịch bản sau thành 4-6 phân cảnh.

KỊCH BẢN:
{script_text}

YÊU CẦU:
- Mỗi cảnh 5-8 giây
- Có scene_number, duration, voiceover, visual_description
- visual_description viết bằng tiếng Việt

ĐỊNH DẠNG JSON:
{{
  "scenes": [
    {{
      "scene_number": 1,
      "duration": 6,
      "voiceover": "...",
      "visual_description": "..."
    }}
  ]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        data = json.loads(response.choices[0].message.content)

        return [
            SceneData(**scene_dict)
            for scene_dict in data.get("scenes", [])
        ]
