import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# bcrypt only considers the first 72 bytes of a password and silently ignores
# the rest. Reject anything longer so two distinct passwords can never collide.
BCRYPT_MAX_BYTES = 72


def _within_bcrypt_limit(value: str) -> str:
    if len(value.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes.")
    return value


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str | None = Field(default=None, max_length=255)

    _check_password = field_validator("password")(_within_bcrypt_limit)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    _check_password = field_validator("password")(_within_bcrypt_limit)


class RegisterStartResponse(BaseModel):
    """Returned when a signup is staged and a verification code has been sent."""

    email: EmailStr
    detail: str = "Verification code sent."


class RegisterVerifyRequest(BaseModel):
    email: EmailStr
    # Six-digit numeric code from the verification email.
    code: str = Field(..., pattern=r"^\d{6}$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CodeExchangeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    provider: str
