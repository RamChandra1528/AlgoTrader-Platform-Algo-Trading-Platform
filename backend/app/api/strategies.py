from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.strategy import StrategyCreate, StrategyResponse, StrategyUpdate

router = APIRouter()

VALID_TYPES = {"ma_crossover", "rsi"}

DEFAULT_PARAMS = {
    "ma_crossover": {"fast_period": 10, "slow_period": 30},
    "rsi": {"rsi_period": 14, "overbought": 70, "oversold": 30},
}


@router.get("/", response_model=List[StrategyResponse])
def list_strategies(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(Strategy).filter(Strategy.user_id == current_user.id).all()


@router.post("/", response_model=StrategyResponse, status_code=201)
def create_strategy(
    payload: StrategyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.strategy_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Use: {VALID_TYPES}")

    params = payload.parameters or DEFAULT_PARAMS.get(payload.strategy_type, {})

    strategy = Strategy(
        user_id=current_user.id,
        name=payload.name,
        strategy_type=payload.strategy_type,
        parameters=params,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.user_id == current_user.id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(
    strategy_id: int,
    payload: StrategyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.user_id == current_user.id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if payload.name is not None:
        strategy.name = payload.name
    if payload.parameters is not None:
        strategy.parameters = payload.parameters
    if payload.is_active is not None:
        strategy.is_active = payload.is_active

    db.commit()
    db.refresh(strategy)
    return strategy


@router.delete("/{strategy_id}", status_code=204)
def delete_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.user_id == current_user.id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()
