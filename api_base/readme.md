# AutoAds API - Huong dan MySQL

## 1. Cai thu vien backend

```bash
pip install -r requirements.txt
```

## 2. Tao database MySQL

Chay file [sql/init_mysql.sql](sql/init_mysql.sql) tren MySQL:

```sql
CREATE DATABASE IF NOT EXISTS autoads_system
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;
```

## 3. Cau hinh `.env`

Da bo sung cac bien sau trong [api_base/.env](.env):

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_ADMIN_EMAIL`
- `FRONTEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_AUTH_URL`
- `GOOGLE_TOKEN_URL`
- `GOOGLE_USERINFO_URL`

## 4. Chay API

```bash
python run_api.py
```

Khi API khoi dong:

- He thong tu tao bang `users` trong MySQL.
- Neu chua co admin, he thong tu tao admin mac dinh theo bien `.env`.

## 5. Dang nhap frontend

- Ten dang nhap mac dinh: `admin`
- Mat khau mac dinh: `admin123`

Sau khi dang nhap, vao tab `Quan tri nguoi dung` de tao them tai khoan `admin` hoac `user`.

Neu muon dang ky / dang nhap bang Gmail:

- Dang ky bang tab `Dang ky`.
- He thong se gui mail xac thuc qua Gmail SMTP.
- Can cau hinh Gmail App Password trong `SMTP_USERNAME` va `SMTP_PASSWORD`.
- Link xac thuc se tro ve frontend voi query `verify_token`.

Admin co the xem log render cua tung user ngay trong tab `Quan tri nguoi dung`:

- Chon `Xem log` o tung dong user.
- Xem danh sach `run_id`, ngay chay, so event va cac step da thuc hien.
- Mo chi tiet mot run de xem toan bo event JSONL.
- Xoa log cua tung run neu can.

## 6. Luu lich su render theo user

He thong da duoc cap nhat de khong ghi de video cu:

- Moi lan render se tao `run_id` rieng.
- File duoc luu theo cau truc:
	- `storage/renders/user_<user_id>/<YYYY-MM-DD>/<run_id>/`
- Log tung buoc duoc ghi vao:
	- `storage/renders/user_<user_id>/<YYYY-MM-DD>/<run_id>/events.jsonl`
- Lich su tong hop theo user:
	- `storage/renders/user_<user_id>/history.jsonl`

Admin API ho tro:

- `GET /api/v1/admin/users/{user_id}/logs`
- `GET /api/v1/admin/users/{user_id}/logs/{run_id}`
- `DELETE /api/v1/admin/users/{user_id}/logs/{run_id}`

Auth API ho tro:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/google/login`
- `GET /api/v1/auth/google/callback`

## 7. Luong dang nhap Google redirect (khong hien JSON tho)

Flow backend/frontend:

- Frontend goi link `GET /api/v1/auth/google/login`.
- Backend redirect 302 sang Google OAuth consent.
- Google redirect ve `GET /api/v1/auth/google/callback?code=...`.
- Backend doi code, lay userinfo, tao JWT noi bo.
- Backend redirect 302 ve frontend: `FRONTEND_URL/?token=<jwt>`.
- Frontend luu token vao localStorage va xoa query string khoi URL.

Scopes mac dinh:

- `openid`
- `email`
- `profile`

Luu y quan trong:

- `GOOGLE_REDIRECT_URI` trong `.env` phai trung 100% voi URI da khai bao trong Google Cloud Console.
- Vi backend dung redirect, nguoi dung se khong gap trang JSON tho trong qua trinh dang nhap.
