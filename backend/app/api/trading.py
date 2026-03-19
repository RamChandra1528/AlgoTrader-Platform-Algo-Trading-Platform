from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeExecute, TradeResponse
from app.services.admin import log_audit_event
from app.services.market_data import get_current_price
from app.services.trading_engine import execute_trade_for_user

router = APIRouter()


@router.post("/execute", response_model=TradeResponse, status_code=201)
def execute_trade(
    payload: TradeExecute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = execute_trade_for_user(db, current_user, payload, source="manual")
    log_audit_event(
        db,
        action="trade_executed",
        entity_type="trade",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        entity_id=str(trade.id),
        details={
            "symbol": trade.symbol,
            "side": trade.side,
            "quantity": trade.quantity,
            "price": round(trade.price, 2),
            "source": trade.source,
        },
    )
    return trade


@router.get("/portfolio")
def get_portfolio(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    positions = (
        db.query(Position).filter(Position.user_id == current_user.id).all()
    )

    # Refresh prices
    for pos in positions:
        price = get_current_price(pos.symbol)
        if price:
            pos.current_price = price
            pos.unrealized_pnl = round((price - pos.avg_price) * pos.quantity, 2)
    db.commit()

    total_value = sum(p.current_price * p.quantity for p in positions)
    total_unrealized = sum(p.unrealized_pnl for p in positions)

    return {
        "positions": [
            {
                "symbol": p.symbol,
                "quantity": p.quantity,
                "avg_price": round(p.avg_price, 2),
                "current_price": round(p.current_price, 2),
                "unrealized_pnl": round(p.unrealized_pnl, 2),
                "market_value": round(p.current_price * p.quantity, 2),
            }
            for p in positions
        ],
        "total_market_value": round(total_value, 2),
        "total_unrealized_pnl": round(total_unrealized, 2),
    }


@router.get("/history")
def get_trade_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id)
        .order_by(Trade.executed_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "side": t.side,
            "quantity": t.quantity,
            "price": round(t.price, 2),
            "pnl": round(t.pnl, 2),
            "executed_at": t.executed_at.isoformat(),
        }
        for t in trades
    ]
