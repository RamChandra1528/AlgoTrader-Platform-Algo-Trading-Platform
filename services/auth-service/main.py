from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import structlog
from datetime import datetime, timedelta
from typing import Optional

from .database import get_db, init_db
from .models import User, Role
from .schemas import UserCreate, UserResponse, Token, UserRole
from .auth import (
    authenticate_user, 
    create_access_token, 
    get_current_user,
    verify_token,
    get_password_hash,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Auth Service",
    version="2.0.0",
    description="Authentication and authorization service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

@app.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        role=user.role or UserRole.TRADER
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    logger.info("User registered", user_id=db_user.id, email=user.email)
    return db_user

@app.post("/auth/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    logger.info("User logged in", user_id=user.id, username=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/verify-token")
async def verify_token_endpoint(token_data: dict):
    try:
        token = token_data.get("token")
        if not token:
            raise HTTPException(status_code=400, detail="Token required")
        
        payload = verify_token(token)
        return {"valid": True, "payload": payload}
    except Exception as e:
        logger.error("Token verification failed", error=str(e))
        return {"valid": False, "error": str(e)}

@app.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/auth/users/{user_id}/roles")
async def update_user_role(
    user_id: int,
    role: UserRole,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Only admins can update roles
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.role = role
    await db.commit()
    
    logger.info("User role updated", user_id=user_id, new_role=role.value, updated_by=current_user.id)
    return {"message": "Role updated successfully"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
