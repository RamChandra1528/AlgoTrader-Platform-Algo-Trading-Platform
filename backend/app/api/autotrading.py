from typing import List

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.auto_trader import screen_market, analyze_stock
from app.api.trading import execute_trade
from app.schemas.trade import TradeExecute
from app.services.live_autotrader import AutoTradeConfig, is_running, start, stop

router = APIRouter()


class BudgetConfig(BaseModel):
    budget: float


class AllocationResult(BaseModel):
    symbol: str
    action: str
    quantity: int
    price: float
    allocated_amount: float
    status: str
    detail: str = ""


class ExecuteResponse(BaseModel):
    executed_trades: List[AllocationResult]
    total_spent: float
    budget_remaining: float

class LiveAutoTradeRequest(BaseModel):
    profit_target_pct: float = 0.03
    stop_loss_pct: float = 0.02
    budget_per_trade: float = 2000.0
    max_positions: int = 5
    loop_interval_sec: float = 10.0


class LiveAutoTradeStatus(BaseModel):
    running: bool
    config: LiveAutoTradeRequest | None = None


@router.post("/scan")
def scan_market(
    current_user: User = Depends(get_current_user),
):
    """Scan popular stocks and return ranked trade recommendations."""
    recommendations = screen_market()
    return {"recommendations": recommendations}


@router.post("/execute", response_model=ExecuteResponse)
def auto_execute(
    payload: BudgetConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Automatically execute buy trades based on top market signals within budget.
    """
    budget = payload.budget
    if budget <= 0:
        raise HTTPException(status_code=400, detail="Budget must be greater than 0")

    # 1. Get market scan results
    recommendations = screen_market()
    
    # Filter for BUY signals with strong confidence (>60%)
    buy_signals = [r for r in recommendations if r["signal"] == "BUY" and r["confidence"] > 60]
    
    if not buy_signals:
        return {
            "executed_trades": [],
            "total_spent": 0,
            "budget_remaining": budget,
            "message": "No strong buy signals found in the market right now."
        }

    # 2. Determine allocation - allocate equal amounts to top 3 signals, or less if budget is small
    num_to_buy = min(3, len(buy_signals))
    target_allocation_per_stock = budget / num_to_buy
    
    executed_trades = []
    total_spent = 0.0
    
    # 3. Execute trades
    for rec in buy_signals[:num_to_buy]:
        symbol = rec["symbol"]
        price = rec["current_price"]
        
        # Calculate how many shares we can afford
        quantity = int(target_allocation_per_stock // price)
        
        if quantity <= 0:
            executed_trades.append(
                AllocationResult(
                    symbol=symbol,
                    action="skipped",
                    quantity=0,
                    price=price,
                    allocated_amount=0.0,
                    status="failed",
                    detail=f"Price (${price}) exceeds target allocation (${target_allocation_per_stock:.2f})"
                )
            )
            continue
            
        cost = quantity * price
        
        try:
            # We reuse the existing execute_trade function from the trading router
            trade_req = TradeExecute(
                symbol=symbol,
                side="buy",
                quantity=quantity,
                strategy_id=None
            )
            
            trade = execute_trade(trade_req, db, current_user)
            total_spent += cost
            budget -= cost
            
            executed_trades.append(
                AllocationResult(
                    symbol=symbol,
                    action="buy",
                    quantity=quantity,
                    price=price,
                    allocated_amount=cost,
                    status="success",
                    detail=rec["reasons"][0] if rec["reasons"] else "Strong Buy Signal"
                )
            )
        except Exception as e:
            executed_trades.append(
                AllocationResult(
                    symbol=symbol,
                    action="buy",
                    quantity=quantity,
                    price=price,
                    allocated_amount=0.0,
                    status="failed",
                    detail=str(e)
                )
            )

    return {
        "executed_trades": executed_trades,
        "total_spent": round(total_spent, 2),
        "budget_remaining": round(budget, 2)
    }


@router.get("/live/status", response_model=LiveAutoTradeStatus)
async def live_status(current_user: User = Depends(get_current_user)):
    cfg = None
    running = is_running(current_user.id)
    return {"running": running, "config": cfg}


@router.post("/live/start")
async def live_start(
    payload: LiveAutoTradeRequest,
    current_user: User = Depends(get_current_user),
):
    cfg = AutoTradeConfig(
        profit_target_pct=payload.profit_target_pct,
        stop_loss_pct=payload.stop_loss_pct,
        budget_per_trade=payload.budget_per_trade,
        max_positions=payload.max_positions,
        loop_interval_sec=payload.loop_interval_sec,
    )
    start(current_user.id, cfg)
    return {"status": "started"}


@router.post("/live/stop")
async def live_stop(current_user: User = Depends(get_current_user)):
    stop(current_user.id)
    return {"status": "stopped"}
