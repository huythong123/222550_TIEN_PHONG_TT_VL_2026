from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from fastapi import Request

from app.routers import video_task
from app.routers import auth as auth_router
from app.routers import admin_users as admin_router
from app.routers import admin_resources as admin_resources_router
from app.routers import admin_dashboard as admin_dashboard_router
from app.routers import me_logs as me_logs_router
from app.routers import payment as payment_router
from app.routers import public_resources as public_resources_router
from app.models.user_store import init_db
from pathlib import Path
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


app = FastAPI(
    title="Auto-TVC AI Generator API",
    description="Hệ thống tự động tạo Video Quảng Cáo từ URL bằng AI (Kling & OpenAI).",
    version="1.0.0"
)

# Cấu hình CORS (Cho phép Frontend từ các domain khác gọi API này)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def allow_docs_frame(request: Request, call_next):
    # Remove X-Frame-Options for docs routes so frontend can iframe them during development.
    # WARNING: allowing framing can be a security risk (clickjacking). Use only for local/dev.
    response = await call_next(request)
    try:
        path = request.url.path or ''
        if path.startswith('/docs') or path.startswith('/redoc'):
            response.headers.pop('x-frame-options', None)
    except Exception:
        pass
    return response


app.include_router(video_task.router, prefix="/api/v1/video", tags=["Video AI Production"])
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(admin_router.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(admin_resources_router.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(admin_dashboard_router.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(me_logs_router.router, prefix="/api/v1/me", tags=["Me"])
app.include_router(payment_router.router, prefix="/api/v1", tags=["Payment"])
app.include_router(public_resources_router.router, prefix="/api/v1", tags=["Public"])

# Serve rendered files under /renders so frontend can access final MP4s
ROOT_DIR = Path(__file__).resolve().parent.parent
RENDERS_DIR = ROOT_DIR / "storage" / "renders"
# Ensure render directory exists so static mount always serves it
RENDERS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=str(RENDERS_DIR)), name="renders")
# Also mount legacy path so older saved URLs (/storage/renders/...) keep working in frontend
app.mount("/storage/renders", StaticFiles(directory=str(RENDERS_DIR)), name="storage_renders")

# Additionally mount the workspace-level /storage so requests to /storage/renders/... resolve
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
WORKSPACE_STORAGE = WORKSPACE_ROOT / "storage"
WORKSPACE_STORAGE.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(WORKSPACE_STORAGE)), name="workspace_storage")


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "message": "Hệ thống AI Video Startup đã sẵn sàng!",
        "docs_url": "/docs"
    }