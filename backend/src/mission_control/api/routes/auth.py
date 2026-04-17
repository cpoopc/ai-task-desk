import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from mission_control.domain.models import User
from mission_control.api.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    InviteRequest,
    AuthResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_users_db: dict[str, User] = {}
_tokens: dict[str, str] = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    token = str(uuid.uuid4())
    _tokens[token] = user_id
    return token


@router.post("/register", response_model=AuthResponse)
async def register(data: UserCreate):
    for user in _users_db.values():
        if user.email == data.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    _users_db[user.id] = user

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: UserLogin):
    for user in _users_db.values():
        if user.email == data.email and user.password_hash == hash_password(data.password):
            token = create_token(user.id)
            return AuthResponse(
                token=token,
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    role=user.role,
                    is_active=user.is_active,
                    created_at=user.created_at,
                ),
            )
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/invite", status_code=201)
async def send_invite(data: InviteRequest):
    for user in _users_db.values():
        if user.email == data.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    return {
        "status": "invite_sent",
        "email": data.email,
        "role": data.role,
        "message": "Invite email would be sent in production",
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    user_id = _tokens.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = _users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )
