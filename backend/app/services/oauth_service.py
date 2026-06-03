from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

settings = get_settings()

SUPPORTED_PROVIDERS = {"google", "github"}


@dataclass
class OAuthProfile:
    account_id: str
    email: str
    full_name: str | None
    avatar_url: str | None


class OAuthError(Exception):
    """Raised when an OAuth exchange fails or returns unusable data."""


def _google_client() -> tuple[str, str]:
    return settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET


def _github_client() -> tuple[str, str]:
    return settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET


def is_configured(provider: str) -> bool:
    cid, secret = _google_client() if provider == "google" else _github_client()
    return bool(cid and secret)


def build_authorize_url(provider: str, state: str) -> str:
    redirect_uri = settings.redirect_uri(provider)
    if provider == "google":
        client_id, _ = _google_client()
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    # github
    client_id, _ = _github_client()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
        "allow_signup": "true",
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


async def exchange_code(provider: str, code: str) -> OAuthProfile:
    if provider == "google":
        return await _google_exchange(code)
    return await _github_exchange(code)


async def _google_exchange(code: str) -> OAuthProfile:
    client_id, client_secret = _google_client()
    redirect_uri = settings.redirect_uri("google")
    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            raise OAuthError(f"Google token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError("Google token response missing access_token")

        info_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_res.status_code != 200:
            raise OAuthError(f"Google userinfo failed: {info_res.text}")
        info = info_res.json()

    email = info.get("email")
    if not email:
        raise OAuthError("Google account has no email")
    return OAuthProfile(
        account_id=str(info["sub"]),
        email=email,
        full_name=info.get("name"),
        avatar_url=info.get("picture"),
    )


async def _github_exchange(code: str) -> OAuthProfile:
    client_id, client_secret = _github_client()
    redirect_uri = settings.redirect_uri("github")
    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            raise OAuthError(f"GitHub token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError("GitHub token response missing access_token")

        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        user_res = await client.get("https://api.github.com/user", headers=auth_headers)
        if user_res.status_code != 200:
            raise OAuthError(f"GitHub user fetch failed: {user_res.text}")
        user = user_res.json()

        email = user.get("email")
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails", headers=auth_headers
            )
            if emails_res.status_code == 200:
                emails = emails_res.json()
                primary = next(
                    (e for e in emails if e.get("primary") and e.get("verified")),
                    None,
                )
                verified = next((e for e in emails if e.get("verified")), None)
                chosen = primary or verified or (emails[0] if emails else None)
                if chosen:
                    email = chosen.get("email")

    if not email:
        raise OAuthError("GitHub account has no accessible email")
    return OAuthProfile(
        account_id=str(user["id"]),
        email=email,
        full_name=user.get("name") or user.get("login"),
        avatar_url=user.get("avatar_url"),
    )
