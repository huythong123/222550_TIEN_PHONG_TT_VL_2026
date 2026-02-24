import httpx
import logging
from app.config import settings
from app.ingestion.cleaner_service import CleanerService
from app.models.schemas import CleanedContent

logger = logging.getLogger(__name__)

class CrawlerService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.cleaner = CleanerService()

    async def fetch_and_clean(self, url: str) -> CleanedContent:
        """Hàm chính: Tải web và làm sạch dữ liệu"""
        logger.info(f"Đang cào dữ liệu từ URL: {url}")
        
        async with httpx.AsyncClient(headers=self.headers, follow_redirects=True) as client:
            try:
                response = await client.get(url, timeout=settings.MAX_CRAWL_TIMEOUT)
                response.raise_for_status() # Báo lỗi nếu web chết (404, 500)
                
                # Gọi Cleaner để dọn rác
                raw_data = self.cleaner.extract_main_content(response.text, url)
                
                # Trả về dữ liệu chuẩn Pydantic schema
                return CleanedContent(**raw_data)
                
            except httpx.HTTPError as e:
                logger.error(f"Lỗi khi truy cập {url}: {str(e)}")
                raise Exception(f"Không thể cào dữ liệu từ trang web: {url}")