import secrets

from app.core.config import get_settings
from app.core.ttl_store import TTLStore

settings = get_settings()

# Maps a short-lived, single-use code to the freshly minted JWT. The OAuth
# callback hands the *code* to the desktop app via the deep link; the app then
# exchanges it for the token over HTTP. This keeps the JWT out of the browser
# URL, history, and the fallback page.
_codes = TTLStore()


def issue_code(token: str) -> str:
    code = secrets.token_urlsafe(32)
    _codes.put(code, token, settings.OAUTH_CODE_EXPIRE_SECONDS)
    return code


def redeem_code(code: str) -> str | None:
    value = _codes.take(code)
    return value if isinstance(value, str) else None
