import smtplib
from email.message import EmailMessage

from app.config import settings
from app.utils.settings_helper import get_db_setting


def smtp_ready() -> bool:
    return bool(get_db_setting('SMTP_USERNAME') and get_db_setting('SMTP_PASSWORD') and get_db_setting('SMTP_FROM_EMAIL'))


def build_verification_url(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/?verify_token={token}"


def send_verification_email(recipient_email: str, verification_url: str) -> None:
    if not smtp_ready():
        raise RuntimeError("Chưa cấu hình SMTP Gmail để gửi mail xác thực")

    message = EmailMessage()
    message["Subject"] = "Xác thực email để đăng nhập AutoAds"
    message["From"] = f'{get_db_setting("SMTP_FROM_NAME")} <{get_db_setting("SMTP_FROM_EMAIL")}>'
    message["To"] = recipient_email
    message.set_content(
        "Vui lòng xác thực email để hoàn tất đăng ký.\n\n"
        f"Mở liên kết sau để xác thực: {verification_url}\n\n"
        "Nếu bạn không tạo tài khoản này, hãy bỏ qua email này."
    )
    message.add_alternative(
        f"""
        <html>
          <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #222;\">
            <h2>Xác thực email AutoAds</h2>
            <p>Vui lòng bấm nút bên dưới để xác thực email và kích hoạt tài khoản của bạn.</p>
            <p><a href=\"{verification_url}\" style=\"display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;\">Xác thực email</a></p>
            <p>Nếu nút không hoạt động, sao chép liên kết này:</p>
            <p>{verification_url}</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    with smtplib.SMTP(get_db_setting('SMTP_HOST'), int(get_db_setting('SMTP_PORT', '587'))) as server:
        server.starttls()
        server.login(get_db_setting('SMTP_USERNAME'), get_db_setting('SMTP_PASSWORD'))
        server.send_message(message)