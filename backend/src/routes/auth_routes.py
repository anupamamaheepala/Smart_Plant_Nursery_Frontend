"""
routes/auth_routes.py — Login endpoint
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import verify_password, create_token
from config import users_col

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = users_col.find_one({"username": body.username})

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_token(user["username"], user["role"], user["name"])

    return LoginResponse(
        access_token=token,
        role=user["role"],
        name=user["name"]
    )