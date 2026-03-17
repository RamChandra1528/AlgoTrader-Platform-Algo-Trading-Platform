import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Hash password using PBKDF2 (built-in, no external deps)"""
    salt = hashlib.sha256(b"algotrader_salt").hexdigest()[:32]
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return hashed.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using PBKDF2"""
    return hmac.compare_digest(hash_password(plain_password), hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
