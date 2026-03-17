from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.engine.backtester import BacktestEngine
from app.models.backtest import Backtest
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.backtest import BacktestRequest, BacktestResponse

router = APIRouter()
backtest_engine = BacktestEngine()


@router.post("/run", response_model=BacktestResponse, status_code=201)
def run_backtest(
    payload: BacktestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == payload.strategy_id, Strategy.user_id == current_user.id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    try:
        results = backtest_engine.run(
            strategy_type=strategy.strategy_type,
            symbol=payload.symbol,
            start_date=payload.start_date,
            end_date=payload.end_date,
            initial_capital=payload.initial_capital,
            parameters=strategy.parameters,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Backtest failed: {str(e)}")

    record = Backtest(
        user_id=current_user.id,
        strategy_id=strategy.id,
        symbol=payload.symbol,
        start_date=payload.start_date,
        end_date=payload.end_date,
        initial_capital=payload.initial_capital,
        final_value=results["final_value"],
        total_return=results["total_return"],
        sharpe_ratio=results["sharpe_ratio"],
        max_drawdown=results["max_drawdown"],
        equity_curve=results["equity_curve"],
        trades_log=results["trades_log"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=List[BacktestResponse])
def list_backtests(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Backtest)
        .filter(Backtest.user_id == current_user.id)
        .order_by(Backtest.created_at.desc())
        .all()
    )


@router.get("/{backtest_id}", response_model=BacktestResponse)
def get_backtest(
    backtest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Backtest)
        .filter(Backtest.id == backtest_id, Backtest.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return record
