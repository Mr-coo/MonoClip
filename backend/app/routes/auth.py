import html
import json
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.rate_limit import client_ip, enforce_rate_limit
from app.core.security import create_access_token, create_state_token, verify_state_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    CodeExchangeRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service, code_exchange, oauth_service
from app.services.auth_service import EmailNotVerifiedError

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _rate_limit_login(request: Request, email: str) -> None:
    key = f"{client_ip(request)}:{email.lower()}"
    enforce_rate_limit(
        key, settings.LOGIN_RATE_LIMIT, settings.LOGIN_RATE_WINDOW_SECONDS
    )


@router.post("/register", response_model=TokenResponse, summary="Register with email + password")
async def register(
    payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    _rate_limit_login(request, payload.email)
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
async def login(
    payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    _rate_limit_login(request, payload.email)
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

    try:
        user = await auth_service.get_or_create_oauth_user(
            db,
            provider=provider,
            account_id=profile.account_id,
            email=profile.email,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
            email_verified=profile.email_verified,
        )
    except EmailNotVerifiedError as exc:
        return _result_page(error=str(exc))

    token = create_access_token(str(user.id))
    # Hand a single-use code (not the JWT) to the desktop app via the deep link.
    one_time_code = code_exchange.issue_code(token)

    deep_link = None
    if settings.APP_DEEP_LINK:
        deep_link = f"{settings.APP_DEEP_LINK}?{urlencode({'code': one_time_code})}"
    return _result_page(deep_link=deep_link, code=one_time_code)


@router.post(
    "/exchange",
    response_model=TokenResponse,
    summary="Exchange a one-time OAuth code for an access token",
)
async def exchange(payload: CodeExchangeRequest) -> TokenResponse:
    token = code_exchange.redeem_code(payload.code)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code.",
        )
    return TokenResponse(access_token=token)


def _result_page(
    *, deep_link: str | None = None, code: str | None = None, error: str | None = None
) -> HTMLResponse:
    """Lightweight page shown in the browser after the OAuth round-trip.

    On success it redirects to the desktop app's custom protocol, passing a
    short-lived single-use code the app swaps for its token. All interpolated
    values are HTML/JS-escaped to prevent reflected XSS.
    """
    if error:
        body = f"""
        <h2>Sign-in failed</h2>
        <p style="color:#f87171">{html.escape(error)}</p>
        <p>You can close this window and try again.</p>
        """
        return HTMLResponse(body, status_code=400)

    redirect_script = (
        f"<script>window.location.href = {json.dumps(deep_link)};</script>"
        if deep_link
        else ""
    )
    fallback = (
        f"<p>If the app didn't open, paste this code into MonoClip:</p>"
        f"<code style='word-break:break-all'>{html.escape(code)}</code>"
        if code
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
