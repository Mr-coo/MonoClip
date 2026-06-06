import enum
import secrets
import threading
import time
from dataclasses import dataclass

from app.core.config import get_settings

settings = get_settings()


@dataclass
class PendingSignup:
    """A registration awaiting email confirmation, held only in memory."""

    email: str
    hashed_password: str
    full_name: str | None
    code: str
    expires_at: float  # time.monotonic() seconds
    attempts_left: int


class VerifyStatus(enum.Enum):
    OK = "ok"
    INVALID_CODE = "invalid_code"
    # No pending signup: expired, never started, already used, or attempts spent.
    NO_PENDING = "no_pending"


# email -> PendingSignup. In-process only, like the OAuth code/nonce stores; a
# multi-worker deployment would need a shared store (Redis) instead.
_pending: dict[str, PendingSignup] = {}
_lock = threading.Lock()


def _prune(now: float) -> None:
    expired = [key for key, p in _pending.items() if p.expires_at <= now]
    for key in expired:
        del _pending[key]


def _generate_code() -> str:
    upper = 10 ** settings.OTP_LENGTH
    return f"{secrets.randbelow(upper):0{settings.OTP_LENGTH}d}"


def start_signup(*, email: str, hashed_password: str, full_name: str | None) -> str:
    """Stage a pending signup and return a fresh code to email.

    Replaces any earlier pending signup for the same email (e.g. a resend).
    """
    now = time.monotonic()
    code = _generate_code()
    with _lock:
        _prune(now)
        _pending[email] = PendingSignup(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            code=code,
            expires_at=now + settings.OTP_EXPIRE_SECONDS,
            attempts_left=settings.OTP_MAX_ATTEMPTS,
        )
    return code


def verify_signup(email: str, code: str) -> tuple[VerifyStatus, PendingSignup | None]:
    """Check a submitted code.

    On success the pending entry is consumed and returned so the caller can
    create the account. A wrong code spends one attempt; running out of attempts
    discards the entry (reported as NO_PENDING).
    """
    now = time.monotonic()
    with _lock:
        _prune(now)
        pending = _pending.get(email)
        if pending is None:
            return VerifyStatus.NO_PENDING, None
        if secrets.compare_digest(pending.code, code):
            del _pending[email]
            return VerifyStatus.OK, pending
        pending.attempts_left -= 1
        if pending.attempts_left <= 0:
            del _pending[email]
            return VerifyStatus.NO_PENDING, None
        return VerifyStatus.INVALID_CODE, None
