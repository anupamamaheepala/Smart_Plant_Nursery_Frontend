"""
auth.py — JWT creation, verification, and role-based dependency guards
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, users_col

bearer_scheme = HTTPBearer()


# ── Password Helpers ──────────────────────────────────────────────────────────

def verify_password(plain: str, stored: str) -> bool:
    """
    Supports both plain-text passwords (dev, e.g. '1234')
    and bcrypt hashed passwords (production).
    """
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        return bcrypt.checkpw(plain.encode(), stored.encode())
    return plain == stored   # plain text fallback for dev


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_token(username: str, role: str, name: str) -> str:
    payload = {
        "sub":  username,
        "role": role,
        "name": name,
        "exp":  datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ── FastAPI Dependency — get current user from Bearer token ───────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    return decode_token(credentials.credentials)


# ── Role Guards ───────────────────────────────────────────────────────────────

def require_role(*roles: str):
    """Usage: Depends(require_role('owner')) or Depends(require_role('admin','owner'))"""
    def guard(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {list(roles)}"
            )
        return user
    return guard