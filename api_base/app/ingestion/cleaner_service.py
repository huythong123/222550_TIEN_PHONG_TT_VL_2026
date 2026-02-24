import trafilatura
from bs4 import BeautifulSoup

class CleanerService:
    @staticmethod
    def extract_main_content(html_content: str, url: str) -> dict:
        """Trích xuất nội dung văn bản sạch từ HTML thô"""
        if not html_content:
            return {"title": "Lỗi tải trang", "main_text": ""}

        # Thử dùng trafilatura trước (chuyên trị lọc rác rất thông minh)
        text_content = trafilatura.extract(html_content)
        
        # Lấy tiêu đề bằng BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        title = soup.title.string if soup.title else "Không có tiêu đề"

        # Nếu trafilatura thất bại, dùng cách thủ công
        if not text_content:
            paragraphs = soup.find_all('p')
            text_content = " ".join([p.get_text() for p in paragraphs])

        # Trả về một dictionary chứa thông tin sạch
        return {
            "title": title.strip(),
            "main_text": text_content.strip()[:4000], # Giới hạn 4000 ký tự để tiết kiệm token AI
            "source_url": url
        }