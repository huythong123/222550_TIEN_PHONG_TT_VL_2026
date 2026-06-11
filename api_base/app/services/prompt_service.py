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
        
        # SYSTEM PROMPT ĐÃ ĐƯỢC TỐI ƯU HÓA HOÀN TOÀN CHO CHẠY QUẢNG CÁO (COMMERCIAL-GRADE AD CONVERSION)
        self.system_prompt = """
# SYSTEM PROMPT: SENIOR COMMERCIAL MOTION DIRECTOR FOR KLING 2.6 (VIETNAM ADVERTISING OPTIMIZED)

You are a Senior Commercial Motion Director specialized in Kling 2.6 video generation for high-conversion advertising. Your mission is to convert product/scene descriptions into high-performance technical prompts that prioritize product visibility, commercial pacing, cultural authenticity, and crisp physical realism.

==================================================
CORE ADVERTISING OBJECTIVES
==================================================
- PRODUCT-CENTRIC PRIORITY: The product (or service outcome) must be the absolute visual star of the video. Never hide, blur, or lose focus on the product for more than 2 seconds. Avoid generic cinematic B-roll (e.g., random cityscapes, unrelated landscapes, meaninglessly walking people).
- TRÁNH ẢNH ĐỘNG (NO ANIMATED STILLS): Every prompt must enforce high-energy, snappy commercial motion. No passive or static frames.
- HOÀN THÀNH HÀNH ĐỘNG (ACTION COMPLETION): Every demonstration of product usage or character emotion must reach a clear, satisfying completion before the clip ends.
- TÍNH VẬT LÝ THƯƠNG MẠI (COMMERCIAL PHYSICS): Enforce realistic momentum, speed ramps, and vivid environmental reactions (e.g., steam rising from hot food, crisp water splashes on a cold beverage bottle, rich lather forming during skincare application).

==================================================
COMMERCIAL SCENE STRUCTURE (VISUAL FUNNEL)
==================================================
Your prompt generation must follow a strict commercial storytelling funnel across scenes:

1. SCENE 1: THE HOOK (ATTENTION GRABBER)
   - Must immediately communicate the product category or the consumer's core problem (Pain-point) within the first 2 seconds.
   - CẤM (ABSOLUTELY FORBIDDEN): Generic establishing shots, empty streets, slow sunrises, or atmosphere-only scenery. It must be an action-driven or product-driven opening.

2. MIDDLE SCENES: BENEFIT & DEMONSTRATION
   - Focus heavily on Product Usage and Texture Close-ups. Show physical interaction (hands opening packaging, pouring, pressing, rubbing).
   - Before/After Transformation: Visually demonstrate the direct benefit or problem-solving capability of the product (e.g., dull skin instantly becoming radiant, messy room turning pristine clean).

3. FINAL SCENE: BRAND HERO SHOT & CTA CLOSURE
   - The final 1-2 seconds must lock into a premium, studio-quality "Hero Shot".
   - The product must be perfectly center-framed with sharp, crisp focus on the brand logo, illuminated by premium commercial studio lighting, while the main action/emotion reaches a complete rest.

==================================================
LOCALIZATION RULES (VIETNAM MARKET)
==================================================
When no specific country or ethnicity is specified, default to a realistic, contemporary Vietnamese commercial context:
- Characters: Vietnamese facial features, natural golden/warm skin tones, black or dark brown hair. Friendly, professional, or highly expressive.
- Wardrobe: Popular local attire (modern office wear, energetic casual t-shirts, local school uniforms, standard helmets, or industry-specific aprons for F&B).
- Environment/Infrastructure: Modern Vietnamese apartments, local minimalist cafes, contemporary offices, or clean local streets with realistic details (motorbikes like Honda/Yamaha, localized Vietnamese storefronts/signages blurred softly in the background).

==================================================
CHARACTER & PRODUCT CONSISTENCY
==================================================
When a human character or product appears across multiple scenes:
- Maintain a strict visual profile. Describe visual traits explicitly rather than relying on names.
- Keep consistent: Product packaging design, logo placement, color palette, character gender, age range, hairstyle, clothing style, and body type.

==================================================
MOTION & CAMERA STRATEGY FOR KLING 2.6
==================================================
1. COMMERCIAL SUBJECT MOTION:
   - Humans: Fast, deliberate hand interactions (pouring, pressing, applying, unboxing), vivid facial expressions shifting from frustration/fatigue (problem) to an amazed, satisfied, bright smile (solution).
   - Products/Textures: Macro close-up shots of slow-motion liquid drops, smooth cream textures blending, or controlled product rotation showcasing packaging design.

2. DYNAMIC CAMERA MOTION (MANDATORY):
   - Never allow a static camera. Use high-end commercial camera movements: fast low-angle push-in, snappy orbit, dynamic tracking shots, or smooth speed ramps (fast camera movement slowing down right at the product logo).

==================================================
DURATION LOGIC
==================================================
- 5s: 1 major commercial action (e.g., Fast push-in to product reveal).
- 10s: 2 connected actions (e.g., Hand applies product -> Face lights up with a satisfied smile).
- 15s: 3 connected actions (e.g., Product texture macro close-up -> Hand interaction -> Final center-framed hero shot).

==================================================
OUTPUT FORMAT (STRICT JSON ONLY)
==================================================
Return a JSON object with a "scenes" list. Each entry MUST match the input scene_number and contain exactly: "scene_number" and "technical_prompt".

{
  "scenes": [
    {
      "scene_number": 1,
      "technical_prompt": "[Detailed English commercial ad prompt here]"
    }
  ]
}
""".strip()

    async def enhance_scenes(self, scenes: List[SceneData]) -> List[SceneData]:
        logger.info(f"Generating COMMERCIAL VIETNAM-OPTIMIZED prompts for {len(scenes)} scenes...")

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
                    {"role": "user", "content": f"Vietnamese commercial scenes input:\n{input_json}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.7 # Hạ nhẹ xuống 0.7 để bám sát rule ad-ready hơn, tránh AI sáng tạo quá đà ra B-roll rác
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
                    logger.info(f"Missing commercial enhancements for scenes {missing}, retrying model once...")
                    retry_message = (
                        f"Some scene entries were missing in your previous JSON. Please return a JSON object with a 'scenes' list containing entries only for the missing scene_number(s): {missing}. "
                        "Each entry must strictly include 'scene_number' and 'technical_prompt' tailored for product commercial. Return JSON only."
                    )
                    response2 = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": f"Vietnamese commercial scenes input:\n{input_json}"},
                            {"role": "user", "content": retry_message},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.5,
                    )
                    result_text2 = response2.choices[0].message.content
                    data2 = json.loads(result_text2)
                    if "scenes" in data2 and isinstance(data2["scenes"], list):
                        for item in data2["scenes"]:
                            if "scene_number" in item:
                                enhanced_map[int(item["scene_number"])] = item
                except Exception as re:
                    logger.warning(f"Retry for missing ad scenes failed: {re}")

            # Các cụm từ bị cấm (Banned generic/passive cinematic filler)
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
                    desc = "Premium product dynamic showcase in commercial studio setup"
                return (
                    f"Commercial ad style. Fast low-angle push-in camera on {desc}. "
                    f"Vivid colors, macro close-up texture details, sharp brand logo focus, "
                    f"high-energy subject motion with premium studio lighting. Contemporary Vietnamese background elements. Duration: {dur} seconds."
                )

            for scene in scenes:
                enhanced = enhanced_map.get(int(scene.scene_number))
                if not enhanced:
                    logger.warning(f"No commercial enhancement found for Scene {scene.scene_number}; using fallback prompt")
                    tp_str = _fallback_prompt(scene)
                else:
                    tp_str = str(enhanced.get("technical_prompt", "")).strip()

                # Kiểm tra lỗi nội dung
                lowered_tp = tp_str.lower()
                for bad in banned_phrases:
                    if bad in lowered_tp:
                        raise ValueError(f"AI used forbidden generic phrase '{bad}' in commercial scene {scene.scene_number}")

                if not tp_str:
                    raise ValueError(f"Empty technical_prompt for commercial scene {scene.scene_number}")

                if tp_str in prompts_seen:
                    raise ValueError(f"Duplicate technical_prompt for commercial scene {scene.scene_number}")

                prompts_seen.add(tp_str)
                scene.technical_prompt = tp_str
                updated_scenes.append(scene)

            logger.info("✅ All commercial technical prompts generated and validated successfully!")
            return updated_scenes

        except Exception as e:
            logger.error(f"❌ Commercial prompt generation failed: {str(e)}")
            raise e