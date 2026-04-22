"""
routes/user_routes.py — Admin-only user management (CRUD)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from auth import require_role, hash_password
from config import users_col

router = APIRouter(prefix="/users", tags=["Users"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateUserBody(BaseModel):
    username: str
    password: str
    role: str       # admin | gardener | owner
    name: str


class UpdateUserBody(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    name: Optional[str] = None


def serialize_user(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("password", None)   # never expose password
    return doc


# ── GET all users ─────────────────────────────────────────────────────────────

@router.get("/")
def list_users(user=Depends(require_role("admin"))):
    docs = users_col.find({}, {"password": 0})  # exclude password field
    return [serialize_user(d) for d in docs]


# ── CREATE user ───────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_user(body: CreateUserBody, user=Depends(require_role("admin"))):
    if body.role not in ["admin", "gardener", "owner"]:
        raise HTTPException(400, "Role must be admin, gardener, or owner")

    existing = users_col.find_one({"username": body.username})
    if existing:
        raise HTTPException(400, f"Username '{body.username}' already exists")

    new_user = {
        "username": body.username,
        "password": hash_password(body.password),
        "role":     body.role,
        "name":     body.name,
    }
    result = users_col.insert_one(new_user)
    return {"message": "User created", "id": str(result.inserted_id)}


# ── UPDATE user ───────────────────────────────────────────────────────────────

@router.put("/{user_id}")
def update_user(user_id: str, body: UpdateUserBody, user=Depends(require_role("admin"))):
    updates = {}
    if body.password:
        updates["password"] = hash_password(body.password)
    if body.role:
        if body.role not in ["admin", "gardener", "owner"]:
            raise HTTPException(400, "Role must be admin, gardener, or owner")
        updates["role"] = body.role
    if body.name:
        updates["name"] = body.name

    if not updates:
        raise HTTPException(400, "Nothing to update")

    result = users_col.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")

    return {"message": "User updated"}


# ── DELETE user ───────────────────────────────────────────────────────────────

@router.delete("/{user_id}")
def delete_user(user_id: str, user=Depends(require_role("admin"))):
    result = users_col.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": "User deleted"}