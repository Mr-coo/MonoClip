import secrets
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.ttl_store import TTLStore

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Nonces of state tokens that have already been redeemed, kept just long enough
# to cover the token's own lifetime — blocks replay of a captured callback URL.
_used_state_nonces = TTLStore()


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _pwd_context.verify(password, hashed)


# Precomputed once; verifying against it costs the same as a real check so login
# timing doesn't reveal whether an account exists.
_DUMMY_HASH = _pwd_context.hash("monoclip-timing-equalizer")


def dummy_password_verify() -> None:
    _pwd_context.verify("monoclip-timing-equalizer", _DUMMY_HASH)


def _encode(payload: dict, expires_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    to_encode = {
        **payload,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])


def create_access_token(subject: str) -> str:
    """Mint the user-facing access token (sub = user id)."""
    return _encode({"sub": subject, "type": "access"}, settings.ACCESS_TOKEN_EXPIRE_MINUTES)


def decode_access_token(token: str) -> dict:
    payload = _decode(token)
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token")
    return payload


def create_state_token(provider: str) -> str:
    """Short-lived signed state for the stateless OAuth flow (CSRF protection)."""
    return _encode(
        {"provider": provider, "nonce": secrets.token_urlsafe(16), "type": "state"},
        settings.STATE_TOKEN_EXPIRE_MINUTES,
    )


def verify_state_token(token: str, provider: str) -> bool:
    try:
        payload = _decode(token)
    except jwt.PyJWTError:
        return False
    if payload.get("type") != "state" or payload.get("provider") != provider:
        return False
    nonce = payload.get("nonce")
    if not nonce:
        return False
    # Single-use: reject if this state has already been redeemed.
    return _used_state_nonces.first_use(
        nonce, settings.STATE_TOKEN_EXPIRE_MINUTES * 60
    )
