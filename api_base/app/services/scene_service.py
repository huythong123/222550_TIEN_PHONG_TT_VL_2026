import json
import logging
from typing import List

from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import MasterScript, SceneData

logger = logging.getLogger(__name__)


class SceneService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY
        )
        self.model = "gpt-4o-mini"

    async def split_into_scenes(
        self,
        master_script: MasterScript,
        target_duration: int = None
    ) -> List[SceneData]:

        logger.info(
            "split_into_scenes received target_duration=%r",
            target_duration
        )

        td = None
        if target_duration is not None:
            try:
                td = int(target_duration)
            except Exception:
                td = None

        hook_words = len(
            master_script.hook.split()
        )

        body_words = len(
            master_script.body.split()
        )

        cta_words = len(
            master_script.call_to_action.split()
        )

        MAX_WORDS_PER_SCENE = 19

        body_scene_count = max(
            1,
            round(
                body_words / MAX_WORDS_PER_SCENE
            )
        )

        scene_count = (
            1                  # Hook
            + body_scene_count # Body
            + 1                # CTA
        )

        # Giới hạn theo thời lượng video
        if td == 15:
            scene_count = min(scene_count, 3)

        elif td == 30:
            scene_count = min(scene_count, 6)

        elif td == 60:
            scene_count = min(scene_count, 12)
        script_text = f"""
HOOK:
{master_script.hook}

BODY:
{master_script.body}

CALL TO ACTION:
{master_script.call_to_action}
"""

        prompt = f"""
Bạn là đạo diễn TVC quảng cáo chuyên nghiệp.

Hãy chuyển kịch bản dưới đây thành CHÍNH XÁC {scene_count} phân cảnh storyboard.

KỊCH BẢN:
{script_text}

YÊU CẦU:

- Tạo đúng {scene_count} cảnh.
- Không được tạo nhiều hơn hoặc ít hơn.
- Không được chỉ cắt câu từ body.
- Mỗi cảnh phải là một cảnh quay riêng biệt.
- Có tiến trình kể chuyện hợp lý.
- Cảnh đầu phải sử dụng nội dung từ HOOK.
- Cảnh cuối phải sử dụng nội dung từ CALL TO ACTION.
- Các cảnh ở giữa sử dụng nội dung BODY.
- Không được bỏ HOOK.
- Không được bỏ CALL TO ACTION.
- Tổng thời lượng khoảng {td or 30} giây.

QUAN TRỌNG VỀ VOICEOVER:

- Không được tạo cảm giác như các câu độc lập hoặc danh sách gạch đầu dòng.
- Mỗi scene chỉ là một phần của câu chuyện tổng thể.
- Người xem phải cảm giác đang nghe một narrator kể chuyện liên tục.

- Voiceover của mỗi scene lý tưởng từ 10 đến 20 từ.
- Không vượt quá 21 từ.
- Ưu tiên câu ngắn.
- Chỉ giữ phần quan trọng nhất của thông tin.
- Loại bỏ các cụm giải thích không cần thiết.
- Nếu một ý có thể được truyền tải ngắn gọn hơn, hãy ưu tiên cách diễn đạt ngắn gọn.
- Ưu tiên tự nhiên hơn là cố ép số từ.
- Voiceover phải đọc xong tự nhiên trong duration của scene.
- Không được cắt ngang câu nói.
- Không được chia một câu thành nhiều scene.
- Nếu nội dung dài, hãy tách thành câu mới ở scene tiếp theo.
- Mỗi scene phải truyền tải một ý hoàn chỉnh.
- Duration phải phù hợp với độ dài voiceover.

- HOOK không cần lặp lại nguyên văn, có thể diễn đạt lại tự nhiên hơn.
- CALL TO ACTION phải là phần kết luận tự nhiên của câu chuyện, không được chuyển ý đột ngột.

Mỗi cảnh phải có:

- scene_number
- duration
- voiceover
- visual_description

VOICEOVER RULES:

- Khi ghép tất cả voiceover của các scene lại phải tạo thành một đoạn thuyết minh liên tục.
- Không viết mỗi scene như một câu độc lập.
- Các scene phải có sự chuyển ý tự nhiên.
- Người xem phải cảm giác đang nghe một MC dẫn chuyện liên tục.
- Tránh việc mỗi scene chỉ đọc một thông tin riêng lẻ.
- Mỗi scene phải tiếp nối nội dung của scene trước đó.
- Không lặp lại thông tin đã nói ở scene trước.
- Scene đầu tiên phải mở chủ đề.
- Scene cuối cùng chính là CTA.
- Không cần dẫn tới CTA vì bản thân scene cuối đã là CTA.

LUỒNG VOICEOVER:

- Scene đầu tiên sử dụng nội dung HOOK để mở chủ đề.
- Các scene ở giữa sử dụng nội dung BODY để triển khai nội dung chính.
QUAN TRỌNG VỀ NỘI DUNG:

- Không cần giữ nguyên câu chữ trong BODY.
- Được phép rút gọn, diễn đạt lại và tóm tắt nội dung.
- Chỉ giữ lại các ý quan trọng nhất.
- Loại bỏ các từ giải thích dài dòng hoặc thông tin phụ.
- Mỗi scene chỉ nên chứa một ý chính.
- Ưu tiên ngắn gọn, dễ hiểu, dễ nghe.
- Không cố nhồi nhét toàn bộ BODY vào các scene.
- Mục tiêu là tạo voiceover phù hợp video ngắn.
- Scene cuối cùng sử dụng nội dung CALL TO ACTION để kết thúc video.

- Chỉ các scene ở giữa mới được sử dụng cụm chuyển ý.
- Scene đầu không cần sử dụng cụm chuyển ý.
- Scene cuối không được sử dụng cụm chuyển ý.


Mỗi scene là một điểm nhấn quảng cáo.

Các scene phải liên quan với nhau
nhưng không bắt buộc tạo cảm giác MC kể chuyện liên tục.

Ưu tiên:

- Nêu lợi ích
- Nêu giá trị
- Nêu điểm nổi bật
- Nêu cảm xúc

Voiceover của từng scene phải đủ mạnh để đứng độc lập như một cảnh quảng cáo.

- Scene cuối phải tạo cảm giác kết thúc tự nhiên và dẫn tới lời kêu gọi hành động.
- Scene cuối nên đóng vai trò tổng kết hoặc lời nhắn cuối video.

Mục tiêu là tạo cảm giác toàn bộ video chỉ có một người dẫn chuyện đang kể liên tục.

visual_description:

- Viết bằng tiếng Việt.
- Mô tả rõ hình ảnh sẽ xuất hiện.
- Visual phải thể hiện trực tiếp nội dung voiceover của scene.
- Visual phải bám sát nội dung kịch bản và chủ đề tổng thể của video.
- Mỗi scene phải có bối cảnh, chủ thể và hành động rõ ràng.
- Không mô tả chung chung hoặc mơ hồ.
- Không sử dụng các hình ảnh ngẫu nhiên không liên quan đến nội dung scene.
- Ưu tiên hình ảnh truyền tải thông tin thay vì chỉ mô tả khung cảnh.

QUAN TRỌNG:

- Scene đầu tiên là HOOK.
- Visual của scene đầu phải thể hiện chủ đề tổng thể của toàn bộ video.
- Visual của scene đầu phải giúp người xem hiểu video sắp nói về vấn đề gì.
- Visual của scene đầu phải phản ánh các nội dung trọng tâm sẽ xuất hiện trong các scene tiếp theo.
- Không được sử dụng hình ảnh chung chung chỉ để tạo bối cảnh.
- Không được tạo visual không liên quan đến HOOK.

- Các scene ở giữa phải minh họa trực tiếp cho ý chính của voiceover tương ứng.
- Mỗi scene chỉ tập trung vào một ý chính.

- Scene cuối là CTA.
- Visual của scene cuối phải tạo cảm giác kết thúc video.
- Visual của scene cuối phải hỗ trợ thông điệp CTA.
- Không tạo thêm nội dung mới ở scene cuối.

- Ưu tiên hình ảnh có hành động rõ ràng.
- Ưu tiên hình ảnh có nhiều thông tin trực quan.
- Hạn chế các mô tả quá đơn giản, quá chung chung hoặc lặp lại giữa các scene.

STYLE:

- Viết voiceover theo phong cách TikTok, Reel, YouTube Shorts.
- Tự nhiên, cuốn hút, có cảm xúc.
- Không viết như đọc báo hoặc đọc tài liệu.
- Tránh lặp từ khóa liên tục.
- Mỗi scene phải tạo cảm giác đang dẫn dắt người xem sang scene tiếp theo.

BODY SPLIT RULES:

- Scene đầu tiên sử dụng HOOK.
- Scene cuối cùng sử dụng CTA.
- Các scene ở giữa chỉ lấy các ý quan trọng nhất trong BODY.

Ví dụ:
- Nếu một ý có phần mô tả dài, chỉ giữ thông tin chính.
- Không cần đưa đầy đủ mọi chi tiết vào voiceover.
- Ưu tiên sự ngắn gọn hơn sự đầy đủ tuyệt đối.
JSON:

{{
  "scenes": [
    {{
      "scene_number": 1,
      "duration": 5,
      "voiceover": "...",
      "visual_description": "..."
    }}
  ]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Output valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={
                "type": "json_object"
            },
            temperature=0.5,
        )

        data = json.loads(
            response.choices[0].message.content
        )

        scenes_raw = (
            data.get("scenes")
            if isinstance(data, dict)
            else None
        )

        if (
            not scenes_raw
            or not isinstance(scenes_raw, list)
        ):
            raise Exception(
                "OpenAI trả về phân cảnh không hợp lệ."
            )

        # Ép đúng số cảnh
        if len(scenes_raw) > scene_count:
            scenes_raw = scenes_raw[:scene_count]

        while len(scenes_raw) < scene_count:
            scenes_raw.append({
                "scene_number": len(scenes_raw) + 1,
                "duration": 5,
                "voiceover": "",
                "visual_description": ""
            })

        normalized = []

        for idx, scene_dict in enumerate(scenes_raw):
            normalized.append(
                SceneData(
                    scene_number=int(scene_dict.get("scene_number", idx + 1)),
                    duration=int(scene_dict.get("duration", 5)),
                    voiceover=(scene_dict.get("voiceover", "") or "").strip(),
                    visual_description=(scene_dict.get("visual_description", "") or "").strip(),
                )
            )

        # Post-process: ensure each scene.voiceover <= 21 words and not cut mid-sentence.
        async def _shorten_text(text: str, prev_text: str, next_text: str) -> str:
            try:
                words = text.split()
                if len(words) <= 21:
                    return text

                prompt_shorten = (
                    "Bạn là biên tập viên tiếng Việt. Rút gọn câu sau thành tối đa 21 từ, giữ nguyên ý chính, "
                    "không cắt đoạn giữa câu, và đảm bảo câu đọc tự nhiên trong một phân cảnh ngắn. Nếu cần, "
                    "diễn đạt lại sao cho ngắn gọn nhưng đủ nghĩa. Không thêm từ chuyển ý mới.\n\n"
                    f"NGUỒN:\n{text}\n\nCONTEXT TRƯỚC:\n{prev_text or ''}\n\nCONTEXT SAU:\n{next_text or ''}\n\n"
                    "Trả về kết quả bằng tiếng Việt: chỉ nội dung rút gọn, không thêm chú thích."
                )

                resp = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a concise Vietnamese copy editor."},
                        {"role": "user", "content": prompt_shorten},
                    ],
                    temperature=0.3,
                )
                out = resp.choices[0].message.content.strip()
                if out:
                    return out
                return " ".join(words[:21])
            except Exception:
                try:
                    return " ".join(text.split()[:21])
                except Exception:
                    return text

        # Run shortening sequentially to preserve narrative context (uses previous/next)
        for i in range(len(normalized)):
            voice = normalized[i].voiceover or ""
            if not voice:
                continue
            if len(voice.split()) <= 21:
                continue
            prev_v = normalized[i - 1].voiceover if i > 0 else ""
            next_v = normalized[i + 1].voiceover if i < len(normalized) - 1 else ""
            try:
                new_voice = await _shorten_text(voice, prev_v, next_v)
                parts = new_voice.split()
                if len(parts) > 21:
                    new_voice = " ".join(parts[:21])
                normalized[i].voiceover = new_voice.strip()
            except Exception:
                normalized[i].voiceover = " ".join(voice.split()[:21])

        return normalized