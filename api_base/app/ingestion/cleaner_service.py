import trafilatura
from bs4 import BeautifulSoup

class CleanerService:
    @staticmethod
    def extract_main_content(html_content: str, url: str) -> dict:
        """Trích xuất nội dung văn bản sạch từ HTML thô"""
        if not html_content:
            return {"title": "Lỗi tải trang", "main_text": ""}

        
        text_content = trafilatura.extract(html_content)
        
       
        soup = BeautifulSoup(html_content, 'html.parser')
        title = soup.title.string if soup.title else "Không có tiêu đề"

        
        if not text_content:
            paragraphs = soup.find_all('p')
            text_content = " ".join([p.get_text() for p in paragraphs])

        
        return {
            "title": title.strip(),
            "main_text": text_content.strip()[:6000],
            "source_url": url
        }