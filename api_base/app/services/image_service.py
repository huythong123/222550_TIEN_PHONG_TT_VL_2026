
import os
import aiohttp
import logging
from app.config import settings
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class ImageSystem:
    def __init__(self):
        # Lazy import to prevent import-time failures if `openai` isn't installed
        try:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning(f"OpenAI AsyncOpenAI client not available: {exc}")
            self.client = None

        self.output_dir = settings.OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)

    async def generate_image(self, prompt: str, filename: str) -> str:
        """Gọi DALL-E 3 vẽ ảnh và tải về máy."""
        try:
            logger.info(f"🎨 Đang vẽ ảnh mồi cho: {filename}...")
            if not self.client:
                raise RuntimeError("OpenAI client unavailable for image generation")

            # Gọi API vẽ ảnh (Kích thước 1024x1024 hoặc 1792x1024 tùy nhu cầu)
            # Hiện tại DALL-E 3 hỗ trợ HD, dùng standard cho tiết kiệm chi phí
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            # Lấy URL ảnh do OpenAI trả về
            image_url = response.data[0].url
            
            # Đường dẫn lưu file
            file_path = os.path.join(self.output_dir, f"{filename}.png")
            
            try:
                import aiohttp
            except ImportError as exc:
                raise RuntimeError("aiohttp is required to download images. Install with 'pip install aiohttp'") from exc

            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as resp:
                    if resp.status == 200:
                        with open(file_path, "wb") as f:
                            f.write(await resp.read())
                        logger.info(f"✅ Đã lưu ảnh thành công: {file_path}")
                        return file_path
                    else:
                        raise Exception(f"Lỗi tải ảnh, HTTP Status: {resp.status}")
                        
        except Exception as e:
            logger.error(f"❌ Lỗi khi vẽ ảnh: {e}")
            raise Exception(f"Tạo ảnh thất bại: {str(e)}")