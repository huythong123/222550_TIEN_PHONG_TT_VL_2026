import os
import time
import base64
import httpx
import logging
import asyncio
from app.config import settings

logger = logging.getLogger(__name__)

class VideoSystem:
    def __init__(self):
        self.api_key = settings.RUNWAY_API_KEY
        self.output_dir = settings.OUTPUT_DIR
        self.base_url = "https://api.dev.runwayml.com/v1" # Base URL của Runway API
        os.makedirs(self.output_dir, exist_ok=True)

    def _encode_image_to_base64(self, image_path: str) -> str:
        """Đọc file ảnh từ ổ cứng và mã hóa thành chuỗi Base64 Data URI."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Không tìm thấy ảnh mồi tại: {image_path}")
            
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            # Định dạng Data URI chuẩn để gửi lên API
            return f"data:image/png;base64,{encoded_string}"

    async def generate_video(self, prompt: str, output_filename: str, image_path: str = None) -> str:
        """Gửi Ảnh + Prompt lên Runway để render Video."""
        
        if not image_path:
            raise ValueError("Model gen4_turbo yêu cầu bắt buộc phải có image_path.")

        logger.info(f"🎥 Bắt đầu Render Video cho: {output_filename}")
        
        # 1. Mã hóa ảnh thành Base64
        image_base64 = self._encode_image_to_base64(image_path)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Runway-Version": "2024-11-06", 
            "Content-Type": "application/json"
        }

        # 2. Gửi lệnh Render (Task) lên Runway
        payload = {
            "model": "gen4_turbo", 
            "promptImage": image_base64,
            "promptText": prompt,
            "duration": 5, # Độ dài mặc định (5 hoặc 10 giây)
            "ratio": "16:9"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # GỌI API TẠO TASK
            response = await client.post(
                f"{self.base_url}/image_to_video",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Runway API Error: {response.text}")
                raise Exception(f"Lỗi khởi tạo Video Task: {response.text}")

            task_id = response.json().get("id")
            logger.info(f"⏳ Đã nộp lệnh render thành công. Task ID: {task_id}. Đang chờ AI xử lý...")

            # 3. Theo dõi tiến độ (Polling)
            # Vì AI render mất vài phút, chúng ta phải liên tục hỏi server xem xong chưa
            max_attempts = 60 # Chờ tối đa 60 lần
            video_url = None
            
            for attempt in range(max_attempts):
                await asyncio.sleep(10) # Nghỉ 10 giây rồi mới hỏi lại để tránh spam
                
                status_resp = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=headers
                )
                
                if status_resp.status_code == 200:
                    task_data = status_resp.json()
                    status = task_data.get("status")
                    
                    if status == "SUCCEEDED":
                        video_url = task_data.get("output")[0]
                        logger.info(f"✅ Render hoàn tất trên server Runway! Đang tải file về...")
                        break
                    elif status in ["FAILED", "CANCELLED"]:
                        logger.error(f"Render thất bại tại server Runway: {task_data}")
                        raise Exception("Lỗi: Runway báo render thất bại.")
                    else:
                        logger.info(f"[{attempt + 1}/{max_attempts}] Runway đang render ({status})...")
                else:
                    logger.warning(f"Lỗi khi kiểm tra tiến độ: {status_resp.status_code}")

            if not video_url:
                raise Exception("Hết thời gian chờ (Timeout) mà Runway vẫn chưa render xong.")

            # 4. Tải file MP4 về thư mục utils/download
            final_path = os.path.join(self.output_dir, f"{output_filename}.mp4")
            
            # Tải file stream
            async with client.stream("GET", video_url) as mp4_resp:
                if mp4_resp.status_code == 200:
                    with open(final_path, "wb") as f:
                        async for chunk in mp4_resp.aiter_bytes():
                            f.write(chunk)
                    logger.info(f"🎬 Đã tải Video thành công lưu tại: {final_path}")
                    return final_path
                else:
                    raise Exception("Không thể tải file MP4 từ URL của Runway.")