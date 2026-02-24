import json
import logging
from typing import List
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import SceneData

logger = logging.getLogger(__name__)

class PromptService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o" # Dùng GPT-4o để viết prompt tiếng Anh cho mượt

    async def enhance_scenes(self, scenes: List[SceneData]) -> List[SceneData]:
        logger.info(f"Đang viết Prompt (Ảnh & Video) cho {len(scenes)} phân cảnh...")

        # 1. Chuẩn bị dữ liệu đầu vào cho AI
        scenes_input = []
        for scene in scenes:
            scenes_input.append({
                "scene_number": scene.scene_number,
                "visual_description_vn": scene.visual_description
            })
        
        input_json = json.dumps(scenes_input, ensure_ascii=False, indent=2)

        # 2. Viết Prompt hệ thống (System Prompt) - Dạy AI cách tách 2 loại prompt
        system_prompt = """
        You are an expert Visual Prompt Engineer for AI Video Production.
        Your task is to take Vietnamese scene descriptions and translate them into TWO distinct English prompts for each scene:

        1. "image_prompt" (For DALL-E 3):
           - Focus ONLY on STATIC visual elements: composition, subject details, lighting, color grading, photographic style (e.g., 35mm lens, cinematic).
           - DO NOT include any camera movement keywords (no "pan", "zoom", "tilt").

        2. "technical_prompt" (For Runway Gen-4 Image-to-Video):
           - Focus ONLY on MOVEMENT and TRANSITIONS.
           - Describe how the camera moves or how subjects move within the static image created above.
           - Use keywords like: "Slow camera dolly in toward...", "Pan right reveals...", "The person turns head slightly...", "Subtle movement of leaves...".

        OUTPUT FORMAT: Return ONLY valid JSON matching the input structure, with 'image_prompt' and 'technical_prompt' added.
        """

        # 3. Gọi OpenAI
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Here is the list of scenes:\n{input_json}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            data = json.loads(result_text)
            
            # 4. Ghép kết quả vào danh sách cảnh gốc
            enhanced_scenes_map = {item['scene_number']: item for item in data.get('scenes', [])}

            updated_scenes = []
            for scene in scenes:
                # Tìm kết quả tương ứng
                enhanced_data = enhanced_scenes_map.get(scene.scene_number)
                if enhanced_data:
                    # Cập nhật 2 trường mới
                    scene.image_prompt = enhanced_data.get("image_prompt")
                    scene.technical_prompt = enhanced_data.get("technical_prompt")
                updated_scenes.append(scene)
                
            logger.info("Đã tạo xong bộ đôi Prompt (Ảnh/Video) thành công!")
            return updated_scenes

        except Exception as e:
            logger.error(f"Lỗi khi tạo prompt: {e}")
            raise Exception(f"Dịch prompt thất bại: {str(e)}")