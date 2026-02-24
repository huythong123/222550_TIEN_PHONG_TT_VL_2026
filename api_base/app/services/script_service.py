import json
import logging
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import CleanedContent, MasterScript

logger = logging.getLogger(__name__)

class ScriptService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini" # Dùng model này cho rẻ và nhanh

    async def generate_master_script(self, content: CleanedContent) -> MasterScript:
        logger.info(f"Đang lên kịch bản cho sản phẩm: {content.title}")

        prompt = f"""
        Bạn là một Biên kịch Video chuyên nghiệp. Dựa vào nội dung dưới đây, hãy viết một kịch bản Video theo cấu trúc AIDA (Attention, Interest, Desire, Action).
        
        NỘI DUNG GỐC:
        Tiêu đề: {content.title}
        Nội dung: {content.main_text[:2000]} # Giới hạn chữ để tránh quá tải
        
        BẮT BUỘC TRẢ VỀ DỮ LIỆU ĐÚNG CHUẨN JSON VỚI CÁC TRƯỜNG SAU (Không được thiếu trường nào):
        {{
            "tvc_title": "Tên video ngắn gọn, giật tít",
            "target_audience": "Đối tượng người xem mục tiêu",
            "duration_seconds": 60,
            "hook": "3-5 giây đầu: Câu nói gây sốc, thu hút sự chú ý ngay lập tức",
            "body": "Nội dung chính kể chuyện hoặc trình bày vấn đề/giải pháp",
            "call_to_action": "Lời kêu gọi hành động cuối video (Ví dụ: Hãy chia sẻ, Hãy trân trọng...)"
        }}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert copywriter. You must output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            
            # Phân tích JSON AI trả về
            data = json.loads(result_text)
            
            # Ép kiểu vào Schema (Nếu thiếu trường, Pydantic sẽ bắt lỗi ở đây)
            script = MasterScript(**data)
            
            logger.info("Đã tạo xong kịch bản tổng thể thành công!")
            return script

        except Exception as e:
            logger.error(f"Lỗi khi gọi OpenAI tạo kịch bản: {e}")
            raise Exception("Lên kịch bản thất bại. Vui lòng thử lại.")