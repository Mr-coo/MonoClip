from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_local_user(
    db: AsyncSession, email: str, password: str, full_name: str | None
) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_or_create_oauth_user(
    db: AsyncSession,
    *,
    provider: str,
    account_id: str,
    email: str,
    full_name: str | None,
    avatar_url: str | None,
) -> User:
    """Find a user by provider account, falling back to email, else create one."""
    result = await db.execute(
        select(User).where(
            User.provider == provider, User.provider_account_id == account_id
        )
    )
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    # Link to an existing account that shares the email (e.g. registered locally first).
    existing = await get_user_by_email(db, email)
    if existing is not None:
        existing.provider = provider
        existing.provider_account_id = account_id
        if avatar_url and not existing.avatar_url:
            existing.avatar_url = avatar_url
        if full_name and not existing.full_name:
            existing.full_name = full_name
        await db.commit()
        await db.refresh(existing)
        return existing

    user = User(
        email=email,
        hashed_password=None,
        full_name=full_name,
        avatar_url=avatar_url,
        provider=provider,
        provider_account_id=account_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
