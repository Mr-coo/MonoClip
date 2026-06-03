from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_state_token, verify_state_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service, oauth_service

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, summary="Register with email + password")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await auth_service.get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user = await auth_service.create_local_user(
        db, email=payload.email, password=payload.password, full_name=payload.full_name
    )
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse, summary="Login with email + password")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await auth_service.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserResponse, summary="Current authenticated user")
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


def _validate_provider(provider: str) -> None:
    if provider not in oauth_service.SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown OAuth provider '{provider}'.",
        )
    if not oauth_service.is_configured(provider):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OAuth provider '{provider}' is not configured on the server.",
        )


@router.get("/{provider}/login", summary="Start OAuth login (redirects to provider)")
async def oauth_login(provider: str) -> RedirectResponse:
    _validate_provider(provider)
    state = create_state_token(provider)
    url = oauth_service.build_authorize_url(provider, state)
    return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/{provider}/callback", summary="OAuth callback — hands token to the desktop app")
async def oauth_callback(
    provider: str,
    state: str = "",
    code: str = "",
    error: str = "",
    db: AsyncSession = Depends(get_db),
):
    _validate_provider(provider)
    if error:
        return _result_page(error=f"Provider returned an error: {error}")
    if not code or not verify_state_token(state, provider):
        return _result_page(error="Invalid or expired authorization state.")

    try:
        profile = await oauth_service.exchange_code(provider, code)
    except oauth_service.OAuthError as exc:
        return _result_page(error=str(exc))

    user = await auth_service.get_or_create_oauth_user(
        db,
        provider=provider,
        account_id=profile.account_id,
        email=profile.email,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
    )
    token = create_access_token(str(user.id))

    if settings.APP_DEEP_LINK:
        deep_link = f"{settings.APP_DEEP_LINK}?{urlencode({'token': token})}"
        return _result_page(deep_link=deep_link, token=token)
    return _result_page(token=token)


def _result_page(
    *, deep_link: str | None = None, token: str | None = None, error: str | None = None
) -> HTMLResponse:
    """Lightweight page shown in the browser after the OAuth round-trip.

    On success it redirects to the desktop app's custom protocol and also shows the
    token as a manual fallback if the deep link does not fire.
    """
    if error:
        body = f"""
        <h2>Sign-in failed</h2>
        <p style="color:#f87171">{error}</p>
        <p>You can close this window and try again.</p>
        """
        return HTMLResponse(body, status_code=400)

    redirect_script = (
        f"<script>window.location.href = {deep_link!r};</script>" if deep_link else ""
    )
    fallback = (
        f"<p>If the app didn't open, paste this token into MonoClip:</p>"
        f"<code style='word-break:break-all'>{token}</code>"
        if token
        else ""
    )
    body = f"""
    <html><head><meta charset="utf-8"><title>MonoClip sign-in</title></head>
    <body style="font-family:system-ui;background:#111;color:#eee;text-align:center;padding:48px">
      {redirect_script}
      <h2>You're signed in 🎉</h2>
      <p>Returning you to MonoClip…</p>
      {fallback}
    </body></html>
    """
    return HTMLResponse(body)
