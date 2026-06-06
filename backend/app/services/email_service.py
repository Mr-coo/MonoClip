import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailError(Exception):
    """Raised when an outbound email cannot be sent."""


def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _expiry_minutes() -> int:
    return max(1, settings.OTP_EXPIRE_SECONDS // 60)


def _build_message(to_email: str, code: str) -> EmailMessage:
    minutes = _expiry_minutes()
    msg = EmailMessage()
    msg["Subject"] = "Your MonoClip verification code"
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.email_sender}>"
    msg["To"] = to_email
    msg.set_content(
        f"Your MonoClip verification code is {code}.\n\n"
        f"Enter it in the app to finish creating your account. "
        f"The code expires in {minutes} minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )
    msg.add_alternative(_html_body(code, minutes), subtype="html")
    return msg


def _html_body(code: str, minutes: int) -> str:
    return f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1f2937">
  <h2 style="margin:0 0 4px">Verify your email</h2>
  <p style="color:#6b7280;margin:0 0 20px">Enter this code in MonoClip to finish creating your account.</p>
  <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;
              background:#f3f4f6;border-radius:12px;padding:18px 0">{code}</div>
  <p style="color:#6b7280;font-size:13px;margin:20px 0 0">
    This code expires in {minutes} minutes. If you didn't request it, ignore this email.
  </p>
</div>"""


def _deliver(msg: EmailMessage) -> None:
    host, port = settings.SMTP_HOST, settings.SMTP_PORT
    if port == 465:
        # Implicit TLS from the first byte.
        with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        # Plain connection upgraded to TLS via STARTTLS (Gmail's port 587).
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)


def send_otp_email(to_email: str, code: str) -> None:
    """Send a signup verification code. Blocking — call via run_in_threadpool.

    When SMTP isn't configured, the code is logged instead of emailed so the
    flow stays testable in local development without a mail account.
    """
    if not is_configured():
        logger.warning(
            "SMTP not configured — verification code for %s is %s (dev fallback)",
            to_email,
            code,
        )
        return
    try:
        _deliver(_build_message(to_email, code))
    except (smtplib.SMTPException, OSError) as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc)
        raise EmailError("Could not send the verification email.") from exc
