from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserCreate, UserResponse
from app.services.admin import get_platform_settings, log_audit_event

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    platform = get_platform_settings(db)
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role="user",
        starting_balance=100000.0,
        cash_balance=100000.0,
        max_trade_amount=platform.default_max_trade_amount,
        daily_loss_limit=platform.default_daily_loss_limit,
        max_trades_per_day=platform.default_max_trades_per_day,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_event(
        db,
        action="user_registered",
        entity_type="user",
        actor_user_id=user.id,
        target_user_id=user.id,
        entity_id=str(user.id),
        details={"email": user.email, "role": user.role},
    )
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    user.last_login_at = user.last_login_at or user.updated_at
    from datetime import datetime

    user.last_login_at = datetime.utcnow()
    db.commit()
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    log_audit_event(
        db,
        action="user_login",
        entity_type="auth",
        actor_user_id=user.id,
        target_user_id=user.id,
        entity_id=str(user.id),
        details={"email": user.email, "role": user.role},
    )
    return {"access_token": token, "token_type": "bearer", "role": user.role}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
