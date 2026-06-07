# AutoAds System - Hướng dẫn cài đặt

Hệ thống hỗ trợ tạo video quảng cáo tự động bằng AI từ nội dung website.

## Yêu cầu hệ thống

Cài đặt trước các phần mềm sau:

* Python 3.11 trở lên
* Node.js 18 trở lên
* MySQL 8.0 trở lên
* FFmpeg

Kiểm tra phiên bản:

```bash
python --version
node -v
npm -v
ffmpeg -version
```

---

## 1. Clone dự án

```bash
git clone https://github.com/huythong123/222550_TIEN_PHONG_TT_VL_2026.git
cd 222550_TIEN_PHONG_TT_VL_2026
```

---

## 2. Tạo cơ sở dữ liệu

Đăng nhập MySQL và tạo database:

```sql
CREATE DATABASE AutoAds_System
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

---

## 3. Cài đặt Backend

Di chuyển vào thư mục backend:

```bash
cd api_base
```

Tạo môi trường ảo:

```bash
python -m venv .venv
```

Kích hoạt môi trường:

### Windows

```powershell
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Cài đặt thư viện:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Tạo file cấu hình Backend

Tạo file:

```text
api_base/.env
```

Nội dung mẫu:

```env
# OpenAI
OPENAI_API_KEY=

# Kling
KLING_ACCESS_KEY=
KLING_API_KEY=

# Application
SECRET_KEY=your_secret_key

# Database
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=AutoAds_System

# Admin mặc định
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@autoads.local

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# SePay
SEPAY_API_KEY=
SEPAY_ACCOUNT_NUMBER=
SEPAY_ACCOUNT_NAME=
SEPAY_BANK_BRAND=

# Payment
USD_TO_VND=24000
PAYMENT_XOR_KEY=0x5EAFB
PAYMENT_EXPIRE_MINUTES=60

# Website
NAME_WEB=AutoAds
```

---

## 5. Chạy Backend

Trong thư mục `api_base`:

```bash
python run_api.py
```

hoặc:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Truy cập:

```text
http://127.0.0.1:8000/docs
```

---

## 6. Tài khoản Admin

Hệ thống đã có sẵn tài khoản quản trị mặc định:

```text
Username: admin
Password: admin123
```

Nếu muốn tạo thêm tài khoản Admin mới, trong thư mục `api_base` chạy:

```bash
cd scripts
python create_admin.py <username> <password> <email>
```

Ví dụ:

```bash
python create_admin.py admin2 Admin@123 admin2@example.com
```

---

## 7. Cài đặt Frontend

Mở terminal mới:

```bash
cd frontend
```

Cài đặt thư viện:

```bash
npm install
```

---

## 8. Chạy Frontend

```bash
npm run dev
```

Truy cập:

```text
http://localhost:5173
```

---

# Cấu hình API Keys

## OpenAI

Tạo API Key tại:

https://platform.openai.com/api-keys

Điền vào:

```env
OPENAI_API_KEY=your_api_key
```

---

## Kling AI

Đăng ký tài khoản và tạo API Key tại:

https://app.klingai.com

Điền vào:

```env
KLING_ACCESS_KEY=
KLING_API_KEY=
```

---

## Google OAuth

Tạo OAuth Client tại:

https://console.cloud.google.com

Điền vào:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## SePay

Đăng ký tài khoản và lấy API Key tại:

https://my.sepay.vn

Điền vào:

```env
SEPAY_API_KEY=
SEPAY_ACCOUNT_NUMBER=
SEPAY_ACCOUNT_NAME=
SEPAY_BANK_BRAND=
```
