"""
Main Application File
Điểm khởi chạy của hệ thống Auto-TVC AI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Import các Router của hệ thống
from app.routers import video_task

# Cấu hình Logging cho đẹp và dễ nhìn
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="Auto-TVC AI Generator API",
    description="Hệ thống tự động tạo Video Quảng Cáo từ URL bằng AI (Runway & OpenAI).",
    version="1.0.0"
)

# Cấu hình CORS (Cho phép Frontend từ các domain khác gọi API này)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong môi trường thực tế, hãy thay "*" bằng domain của Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn Router vào ứng dụng gốc
app.include_router(video_task.router, prefix="/api/v1/video", tags=["Video AI Production"])

# Endpoint kiểm tra sức khỏe hệ thống (Health Check)
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "message": "Hệ thống AI Video Startup đã sẵn sàng! 🚀",
        "docs_url": "/docs"
    }