import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import get_user_by_id

_bearer = HTTPBearer(auto_error=True)

_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise _credentials_error
    if not user_id:
        raise _credentials_error

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise _credentials_error
    return user
