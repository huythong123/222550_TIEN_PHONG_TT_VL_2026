# AutoAds System

Hệ thống tạo video quảng cáo tự động bằng AI — nhập nội dung website, hệ thống tự động sinh kịch bản, phân cảnh, tạo prompt, lồng tiếng, ghép video.

## Kiến trúc

| Thành phần | Công nghệ |
|---|---|
| Backend API | Python / FastAPI |
| Frontend | React / Vite |
| Database | MySQL 8.0+ (SQLAlchemy ORM) |
| AI | OpenAI (GPT, TTS), Kling AI (text2video) |

## Yêu cầu hệ thống

- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- FFmpeg

## Cài đặt nhanh

### 1. Clone

```bash
git clone https://github.com/huythong123/222550_TIEN_PHONG_TT_VL_2026.git
cd 222550_TIEN_PHONG_TT_VL_2026
```

### 2. Database

```sql
CREATE DATABASE AutoAds_System
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 3. Backend

```bash
cd api_base
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
# source venv/bin/activate

pip install -r requirements.txt
```

Tạo file `.env`:

```env
SECRET_KEY=your_secret_key_here

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=AutoAds_System

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@autoads.local

# API keys — chỉ cần khởi tạo lần đầu, sau đó quản lý qua Admin UI
OPENAI_API_KEY=sk-...
KLING_ACCESS_KEY=...
KLING_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
SEPAY_API_KEY=...
SEPAY_ACCOUNT_NUMBER=...
SEPAY_ACCOUNT_NAME=...
SEPAY_BANK_BRAND=...

USD_TO_VND=24000
PAYMENT_XOR_KEY=0x5EAFB
PAYMENT_EXPIRE_MINUTES=60
NAME_WEB=AutoAds
```

Chạy backend:

```bash
python run_api.py
```

API docs tại: http://127.0.0.1:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập: http://localhost:5173

### 5. Tài khoản Admin mặc định

```
Username: admin
Password: admin123
```

Sau khi đăng nhập, vào **Tích hợp & API Keys** để cập nhật API keys nếu cần.

---

## Quản lý cấu hình qua Admin UI

Tất cả API keys và cấu hình dịch vụ bên thứ ba được quản lý qua giao diện Admin (tab **Tích hợp & API Keys**), lưu trực tiếp vào database — **không cần sửa `.env` hay restart server**.

Các dịch vụ hỗ trợ:

| Tab | Cấu hình |
|---|---|
| OpenAI | API Key |
| Kling AI | Access Key, Secret Key |
| SePay (Ngân hàng) | API Key, Số tài khoản, Chủ tài khoản, Ngân hàng |
| Google OAuth | Client ID, Client Secret, Redirect URI |
| SMTP (Email) | Host, Port, Username, Password, From Email, From Name |

---

## Seed gói Credits (tùy chọn)

```bash
cd api_base
python scripts/seed_packages.py
```

Chỉ chạy khi lần đầu, sau đó quản lý gói trực tiếp trong Admin.
