import threading
import time

from fastapi import HTTPException, Request, status

# key -> list of attempt timestamps (monotonic seconds), pruned on each check.
_attempts: dict[str, list[float]] = {}
_lock = threading.Lock()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    """Sliding-window limiter. Raises HTTP 429 once `limit` is exceeded in the window.

    In-process only (single worker). For multi-worker deployments move this to a
    shared store such as Redis.
    """
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        hits = [t for t in _attempts.get(key, ()) if t > cutoff]
        if len(hits) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please wait a moment and try again.",
            )
        hits.append(now)
        _attempts[key] = hits
