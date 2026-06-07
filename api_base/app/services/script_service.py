import json
import logging
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import CleanedContent, MasterScript

logger = logging.getLogger(__name__)

class ScriptService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"

    async def generate_master_script(self, content: CleanedContent) -> MasterScript:
        logger.info(f"Đang lên kịch bản TVC cho sản phẩm: {content.title}")

        prompt = f"""
Bạn là biên kịch video ngắn chuyên nghiệp.

Bạn có khả năng viết:
- Video quảng cáo
- Video truyền thông
- Video tóm tắt tin tức
- Video giới thiệu nội dung

Nhiệm vụ là truyền tải đúng trọng tâm nội dung đầu vào dưới dạng video ngắn hấp dẫn.

Nhiệm vụ:

- Dựa trên dữ liệu đầu vào, tạo kịch bản video ngắn theo phong cách quảng cáo, truyền thông hoặc giới thiệu nội dung.
- Xác định chủ đề chính từ tiêu đề và toàn bộ nội dung bài viết.
- Tiêu đề là tín hiệu quan trọng nhất để xác định chủ đề chính.
- Nội dung bài viết dùng để làm rõ và bổ sung cho chủ đề được thể hiện trong tiêu đề.
- Hook phải phản ánh chủ đề được nêu trong tiêu đề.
- Không được chọn một chi tiết nổi bật trong nội dung nếu chi tiết đó không đại diện cho chủ đề tổng thể.
- Hook, Body và Call To Action phải bám sát chủ đề chính.

QUAN TRỌNG:

- Chủ đề chính phải phản ánh nội dung tổng thể của bài viết.
- Không được chỉ tập trung vào một chi tiết hoặc một đoạn nhỏ nếu bài viết có nhiều nội dung quan trọng.
- Nếu bài viết chứa nhiều sự kiện, chính sách, tính năng hoặc điểm nổi bật, hãy chọn và tóm tắt các nội dung quan trọng nhất.
- Body phải bao quát các ý chính của bài viết theo mức độ quan trọng.
- Không được làm sai lệch trọng tâm mà tiêu đề và nội dung đang truyền tải.
- Không được biến một chi tiết phụ thành chủ đề chính của toàn bộ video.
- Ưu tiên phản ánh bức tranh tổng thể trước khi đi vào các chi tiết nổi bật.
- Nội dung phải giữ đúng bản chất thông tin gốc nhưng được diễn đạt hấp dẫn và dễ tiếp cận hơn.

Thông tin đầu vào:
- Tiêu đề: {content.title}
- Nguồn: {content.source_url}
- Nội dung: {content.main_text[:5000]}

Yêu cầu đầu ra:
- Trả về JSON hợp lệ với ĐÚNG 3 trường sau:
  1) hook:
- Mở đầu ngắn gọn, thu hút.
- Thể hiện đúng chủ đề tổng thể.

2) body:
- Tóm tắt các nội dung quan trọng nhất.
- Bao quát đầy đủ các ý chính.
- Không tập trung quá mức vào một chi tiết đơn lẻ.
- Nếu bài viết có nhiều ý chính, body phải đề cập ngắn gọn các ý quan trọng nhất.
- Không dành phần lớn nội dung cho một ý duy nhất khi còn nhiều ý quan trọng khác.
- Ưu tiên độ bao quát trước độ chi tiết.

3) call_to_action:
- Phù hợp với toàn bộ nội dung.
- Khuyến khích người xem quan tâm, tìm hiểu hoặc theo dõi thêm.
- Không được kêu gọi hành động trái với nội dung gốc.
- Viết bằng tiếng Việt tự nhiên, súc tích.
- Không thêm trường khác ngoài 3 trường trên.
- CTA phải phù hợp với bản chất nội dung.
- Với tin tức, chính sách hoặc kiến thức: khuyến khích người xem cập nhật, tìm hiểu hoặc theo dõi thêm.
- Với sản phẩm hoặc dịch vụ: có thể kêu gọi trải nghiệm, đăng ký hoặc sử dụng.
- Không được tạo CTA mang tính mua hàng nếu nội dung không phải sản phẩm hoặc dịch vụ.
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là chuyên gia viết kịch bản quảng cáo. Chỉ trả về JSON hợp lệ.",
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                temperature=0.5
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
            
            logger.info("Đã tạo xong kịch bản TVC thành công!")
            return script

        except Exception as e:
            logger.error(f"Lỗi khi gọi OpenAI tạo kịch bản: {e}")
            raise Exception(f"Lên kịch bản thất bại: {str(e)}")