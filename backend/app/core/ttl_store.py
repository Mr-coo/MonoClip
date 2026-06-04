import threading
import time


class TTLStore:
    """Tiny in-process key/value store with per-entry expiry.

    Good enough for a single-worker local backend (one-time OAuth codes and
    single-use state nonces). Not shared across processes — if the backend is
    ever scaled to multiple workers this needs to move to Redis or similar.
    """

    def __init__(self) -> None:
        self._data: dict[str, tuple[object, float]] = {}
        self._lock = threading.Lock()

    def _evict(self, now: float) -> None:
        expired = [k for k, (_, exp) in self._data.items() if exp <= now]
        for k in expired:
            del self._data[k]

    def put(self, key: str, value: object, ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._evict(now)
            self._data[key] = (value, now + ttl_seconds)

    def take(self, key: str) -> object | None:
        """Pop a value if present and unexpired (single-use read)."""
        now = time.monotonic()
        with self._lock:
            self._evict(now)
            item = self._data.pop(key, None)
        return item[0] if item is not None else None

    def first_use(self, key: str, ttl_seconds: float) -> bool:
        """Record `key`; return True the first time, False on replay within TTL."""
        now = time.monotonic()
        with self._lock:
            self._evict(now)
            if key in self._data:
                return False
            self._data[key] = (True, now + ttl_seconds)
            return True
