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
        self.model = "gpt-4o"
        # Định nghĩa System Prompt tối ưu cho Kling 2.6 và bối cảnh Việt Nam
        self.system_prompt = """
# SYSTEM PROMPT: SENIOR MOTION DIRECTOR FOR KLING 2.6 (VIETNAM OPTIMIZED)

You are a Senior Motion Director specialized in Kling 2.6 video generation. Your mission is to convert scene descriptions into high-performance technical prompts that prioritize strong motion, cultural authenticity, and physical realism.

==================================================
CORE OBJECTIVES
==================================================
- TRÁNH ẢNH ĐỘNG (NO ANIMATED STILLS): Mỗi prompt phải có chuyển động rõ rệt.
- HOÀN THÀNH HÀNH ĐỘNG: Hành động phải kết thúc trong thời lượng clip (không bị cắt cụt).
- TÍNH VẬT LÝ: Phải có momentum, gia tốc, và phản ứng của môi trường đối với vật thể.

- Always prioritize visual_description over generic cinematic conventions.
- The generated motion must support the meaning of visual_description.
- Do not replace the intended subject with generic cinematic imagery.

==================================================
LOCALIZATION RULES (VIETNAM & SE ASIA)
==================================================
Khi không chỉ định rõ quốc gia/chủng tộc, mặc định là bối cảnh Việt Nam:
- Nhân vật: Da vàng/bánh mật, tóc đen/nâu đen, nét mặt thuần Việt.
- Trang phục: Quần áo phổ thông (áo thun, quần jeans, nón bảo hiểm, đồng phục học sinh Việt...).
- Hạ tầng: Đường phố nhiều xe máy, quán xá vỉa hè, ghế nhựa, dây điện, kiến trúc nhà ống hoặc làng quê đặc trưng Việt Nam.
- Phương tiện: Xe máy (Honda, Yamaha), xe khách, xe buýt kiểu địa phương.

==================================================
HOOK SCENE RULES
==================================================

Scene 1 is the Hook scene.

- The first scene must visually communicate the overall topic of the video.
- The viewer should immediately understand what the video is about.
- The first scene should visually introduce the key themes that will appear later.
- Avoid generic city scenes, walking scenes or unrelated establishing shots.
- Do not create atmosphere-only scenes.
- The hook scene must explain the topic visually.

==================================================
CHARACTER CONSISTENCY
==================================================

When a human character appears:

- Create a consistent visual profile.
- Use visual traits instead of relying on names.
- Maintain the same appearance across scenes.

Keep consistent:

- gender
- age range
- hairstyle
- clothing style
- body type
- facial characteristics

Do not change appearance between scenes unless explicitly required.

==================================================
MOTION & CAMERA STRATEGY
==================================================
1. SUBJECT MOTION:
   - Con người: Đi bộ dứt khoát, chạy, thao tác tay (cầm, nắm, rót, cắt), biểu cảm khuôn mặt thay đổi rõ rệt.
   - Vật thể: Xe chạy, khói bốc lên, nước đổ, lửa cháy, gió thổi mạnh.

2. CAMERA MOTION (BẮT BUỘC):
   - Không để máy ảnh đứng yên. Sử dụng: tracking shot, low-angle push-in, orbit, FPV drone, pan/tilt.
   - Đối với cảnh vật (Scenery): Dùng Hyperlapse hoặc Drone để tạo cảm giác chuyển động không gian (Parallax).

3. ENVIRONMENTAL REACTION:
   - Tương tác với môi trường: Bụi bay khi xe chạy, nước bắn khi dẫm vào vũng nước, lá cây rung chuyển khi gió thổi.

==================================================
DURATION LOGIC
==================================================
- 5s: 1 major action | 10s: 2 connected actions | 15s: 3 connected actions.

==================================================
SPECIAL CASE: SCENERY ONLY (NẾU CHỈ CÓ CẢNH VẬT)
==================================================
Nếu không có nhân vật: tập trung chuyển động tự nhiên (mưa, xe cộ, khói, mây trôi) và dùng góc máy động (Fly-through, Pan).

==================================================
OUTPUT FORMAT (JSON ONLY)
==================================================
{
  "scenes": [
    {
      "scene_number": 1,
      "technical_prompt": "[Detailed English prompt focusing on: Character consistency, Subject motion, Camera motion, Environmental reaction, and Vietnamese context]"
    }
  ]
}
""".strip()

    async def enhance_scenes(self, scenes: List[SceneData]) -> List[SceneData]:
        logger.info(f"Generating VIETNAM-OPTIMIZED prompts for {len(scenes)} scenes...")

        # Chuẩn bị input từ danh sách SceneData
        scenes_input = [
            {
                "scene_number": s.scene_number,
                "duration": s.duration,
                "voiceover": s.voiceover,
                "visual_description": s.visual_description
            } for s in scenes
        ]

        input_json = json.dumps(scenes_input, ensure_ascii=False, indent=2)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"Vietnamese scenes input:\n{input_json}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.8
            )

            result_text = response.choices[0].message.content
            data = json.loads(result_text)

            if "scenes" not in data or not isinstance(data["scenes"], list):
                raise ValueError("Invalid AI response structure: 'scenes' key missing or not a list.")

            # Map kết quả dựa trên scene_number
            enhanced_map = {int(item["scene_number"]): item for item in data["scenes"] if "scene_number" in item}

            # If the model omitted some scenes, retry once asking specifically for missing scene_numbers
            missing = [int(s.scene_number) for s in scenes if int(s.scene_number) not in enhanced_map]
            if missing:
                try:
                    logger.info(f"Missing enhancements for scenes {missing}, retrying model once...")
                    retry_message = (
                        f"Some scene entries were missing in your previous JSON. Please return a JSON object with a 'scenes' list containing entries only for the missing scene_number(s): {missing}. "
                        "Each entry must include 'scene_number' and 'technical_prompt'. Return JSON only."
                    )
                    response2 = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": f"Vietnamese scenes input:\n{input_json}"},
                            {"role": "user", "content": retry_message},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.6,
                    )
                    result_text2 = response2.choices[0].message.content
                    data2 = json.loads(result_text2)
                    if "scenes" in data2 and isinstance(data2["scenes"], list):
                        for item in data2["scenes"]:
                            if "scene_number" in item:
                                enhanced_map[int(item["scene_number"])] = item
                except Exception as re:
                    logger.warning(f"Retry for missing scenes failed: {re}")

            # Các cụm từ bị cấm (Generic cinematic filler)
            banned_phrases = [
                "slow dolly movement", "dust drifts gently", "fabric moves", 
                "focus racks slightly", "shadows shift subtly", "cinematic atmosphere"
            ]

            prompts_seen = set()
            updated_scenes = []

            def _fallback_prompt(scn: SceneData) -> str:
                desc = (getattr(scn, 'visual_description', '') or '').strip()
                dur = int(getattr(scn, 'duration', 0) or 0) or 5
                if not desc:
                    desc = "A generic Vietnamese street scene with local details and natural motion"
                return (
                    f"{desc}. Emphasize strong subject motion and clear camera movement (e.g. tracking shot, push-in, or orbit). "
                    f"Ensure environmental reaction (dust, crowd, vehicles) and Vietnamese context. Duration: {dur} seconds."
                )

            for scene in scenes:
                enhanced = enhanced_map.get(int(scene.scene_number))
                if not enhanced:
                    logger.warning(f"No enhancement found for Scene {scene.scene_number}; using fallback prompt")
                    tp_str = _fallback_prompt(scene)
                else:
                    tp_str = str(enhanced.get("technical_prompt", "")).strip()

                # Kiểm tra lỗi nội dung
                lowered_tp = tp_str.lower()
                for bad in banned_phrases:
                    if bad in lowered_tp:
                        raise ValueError(f"AI used forbidden generic phrase '{bad}' in scene {scene.scene_number}")

                if not tp_str:
                    raise ValueError(f"Empty technical_prompt for scene {scene.scene_number}")

                if tp_str in prompts_seen:
                    raise ValueError(f"Duplicate technical_prompt for scene {scene.scene_number}")

                prompts_seen.add(tp_str)
                scene.technical_prompt = tp_str
                updated_scenes.append(scene)

            logger.info("✅ All technical prompts generated and validated successfully!")
            return updated_scenes

        except Exception as e:
            logger.error(f"❌ Prompt generation failed: {str(e)}")
            raise e