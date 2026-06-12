import json
import logging
from openai import AsyncOpenAI
from app.config import settings
from app.utils.settings_helper import get_db_setting
from app.models.schemas import CleanedContent, MasterScript

logger = logging.getLogger(__name__)

class ScriptService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=get_db_setting('OPENAI_API_KEY'))
        self.model = "gpt-4o"

    async def generate_master_script(self, content: CleanedContent, target_duration: int = None) -> MasterScript:
        logger.info(f"Đang lên kịch bản TVC cho sản phẩm: {content.title}")
        # Provide guidance to the LLM about target duration so it can produce
        # an appropriate pacing and amount of content for 15/30/60s variants.
        dur_note = ''
        if target_duration:
            try:
                td = int(target_duration)
            except Exception:
                td = None
        else:
            td = None

        if td == 15:
            dur_note = """
HƯỚNG DẪN THEO THỜI LƯỢNG: VIDEO 15 GIÂY

- Chỉ có 1 thông điệp quảng cáo chính.
- Hook cực mạnh trong 3 giây đầu.
- Body chỉ tập trung vào 1-2 lợi ích nổi bật nhất.
- CTA trực tiếp.
- Tổng lời thoại khoảng 20-35 từ.
"""
        elif td == 30:
            dur_note = """
HƯỚNG DẪN THEO THỜI LƯỢNG: VIDEO 30 GIÂY

- Hook mạnh.
- Body tập trung vào 2-3 lợi ích nổi bật.
- Có nhịp tăng cảm xúc.
- CTA rõ ràng.
- Tổng lời thoại khoảng 50-80 từ.
"""
        elif td == 60:
            dur_note = """
HƯỚNG DẪN THEO THỜI LƯỢNG: VIDEO 60 GIÂY

- Có thể kể một câu chuyện ngắn.
- Hook → Vấn đề → Giải pháp → Lợi ích → CTA.
- Tập trung xây dựng cảm xúc và niềm tin.
- Tổng lời thoại khoảng 100-150 từ.
"""

        prompt = f"""
Bạn là Senior Advertising Copywriter chuyên viết TVC quảng cáo ngắn.

MỤC TIÊU:

Biến nội dung website thành một video quảng cáo ngắn hấp dẫn.

KHÔNG viết theo kiểu:
- Tóm tắt bài viết
- Tin tức
- Báo chí
- Giới thiệu khô khan

Hãy viết như một TVC quảng cáo thực sự.

{dur_note}

==================================================
BƯỚC 1: XÁC ĐỊNH HERO SUBJECT
==================================================

Từ tiêu đề và nội dung, xác định chính xác:

- Sản phẩm chính
- Dịch vụ chính
- Thương hiệu chính
- Địa điểm chính
- Hoặc giải pháp nổi bật nhất

Đây là HERO SUBJECT.

Toàn bộ kịch bản phải xoay quanh HERO SUBJECT.

==================================================
BƯỚC 2: XÁC ĐỊNH GIÁ TRỊ CỐT LÕI
==================================================

Tìm các yếu tố quan trọng nhất:

- Lợi ích lớn nhất
- Điểm nổi bật nhất
- Điểm khác biệt nhất
- Giá trị hấp dẫn nhất

Chỉ giữ các thông tin giúp quảng bá HERO SUBJECT.

Không cố gắng đưa mọi thông tin vào video.

==================================================
BƯỚC 3: VIẾT TVC
==================================================

HOOK

- Thu hút ngay lập tức.
- Tạo tò mò hoặc hứng thú.
- Nêu lợi ích hoặc giá trị nổi bật.
- Tối đa 1 câu.

BODY

- Tập trung vào lợi ích và giá trị.
- Mỗi câu phải giúp làm nổi bật HERO SUBJECT.
- Nội dung phải dễ chuyển thành cảnh quay.
- Không lan man.
- Không liệt kê quá nhiều thông tin.

CALL TO ACTION

- Ngắn gọn.
- Tự nhiên.
- Mạnh mẽ.
- Khuyến khích người xem hành động.

==================================================
QUY TẮC QUAN TRỌNG
==================================================

- Không viết như bài báo.
- Không viết như bản tin.
- Không viết như bài tóm tắt.
- Không liệt kê máy móc.
- Không lặp lại cùng một ý.
- Không thêm thông tin không tồn tại trong dữ liệu nguồn.
- Luôn tập trung vào HERO SUBJECT.
- Người xem phải hiểu ngay sản phẩm hoặc dịch vụ đang được quảng bá.

==================================================
THÔNG TIN ĐẦU VÀO
==================================================

Tiêu đề:
{content.title}

Nguồn:
{content.source_url}

Nội dung:
{content.main_text[:5000]}

==================================================
YÊU CẦU ĐẦU RA
==================================================

Chỉ trả về JSON hợp lệ:

{{
  "hook": "...",
  "body": "...",
  "call_to_action": "..."
}}

Không thêm bất kỳ trường nào khác.
"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
    "role": "system",
    "content": """
Bạn là chuyên gia biên kịch TVC quảng cáo ngắn.

Luôn xác định HERO SUBJECT trước khi viết.

Ưu tiên:
- Sản phẩm
- Dịch vụ
- Thương hiệu

Tập trung vào lợi ích nổi bật nhất.

Viết theo phong cách video quảng cáo chuyên nghiệp.

Chỉ trả về JSON hợp lệ.
""",
},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            data = json.loads(result_text)

            # Validate required fields
            missing = [k for k in ("hook", "body", "call_to_action") if k not in data or not isinstance(data.get(k), str) or not data.get(k).strip()]
            if missing:
                logger.error("OpenAI returned invalid master script, missing fields: %s; raw: %s", missing, result_text)
                raise Exception(f"OpenAI tạo kịch bản không hợp lệ, thiếu trường: {', '.join(missing)}")

            script = MasterScript(**{k: data[k].strip() for k in ("hook", "body", "call_to_action")})
            script.run_id = content.run_id
            # record the target_duration used to generate this script
            script.target_duration = td
            
            logger.info("Đã tạo xong kịch bản TVC thành công!")
            return script

        except Exception as e:
            logger.error(f"Lỗi khi gọi OpenAI tạo kịch bản: {e}")
            raise Exception(f"Lên kịch bản thất bại: {str(e)}")