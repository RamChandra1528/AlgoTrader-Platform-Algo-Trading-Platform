from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeExecute, TradeResponse
from app.services.market_data import get_current_price

router = APIRouter()


@router.post("/execute", response_model=TradeResponse, status_code=201)
def execute_trade(
    payload: TradeExecute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    price = get_current_price(payload.symbol)
    if price is None:
        raise HTTPException(status_code=400, detail="Could not fetch price")

    # Calculate PnL for sells
    pnl = 0.0
    position = (
        db.query(Position)
        .filter(Position.user_id == current_user.id, Position.symbol == payload.symbol)
        .first()
    )

    if payload.side == "sell":
        if not position or position.quantity < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient position")
        pnl = (price - position.avg_price) * payload.quantity

    # Record trade
    trade = Trade(
        user_id=current_user.id,
        strategy_id=payload.strategy_id,
        symbol=payload.symbol.upper(),
        side=payload.side,
        quantity=payload.quantity,
        price=price,
        pnl=round(pnl, 2),
        is_paper=True,
    )
    db.add(trade)

    # Update position
    if payload.side == "buy":
        if position:
            total_qty = position.quantity + payload.quantity
            position.avg_price = (
                (position.avg_price * position.quantity) + (price * payload.quantity)
            ) / total_qty
            position.quantity = total_qty
            position.current_price = price
            position.unrealized_pnl = round(
                (price - position.avg_price) * position.quantity, 2
            )
        else:
            position = Position(
                user_id=current_user.id,
                symbol=payload.symbol.upper(),
                quantity=payload.quantity,
                avg_price=price,
                current_price=price,
                unrealized_pnl=0.0,
            )
            db.add(position)
    else:  # sell
        position.quantity -= payload.quantity
        if position.quantity <= 0:
            db.delete(position)
        else:
            position.current_price = price
            position.unrealized_pnl = round(
                (price - position.avg_price) * position.quantity, 2
            )

    db.commit()
    db.refresh(trade)
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
