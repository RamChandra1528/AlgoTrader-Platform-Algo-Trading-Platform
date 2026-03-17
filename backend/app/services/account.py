from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.services.market_data import get_current_price


def build_account_snapshot(db: Session, user: User) -> dict:
    """
    Snapshot used by the WebSocket + UI.
    Values are computed from DB so multiple tabs stay consistent.
    """
    # Refresh prices for unrealized PnL
    positions = db.query(Position).filter(Position.user_id == user.id).all()
    for pos in positions:
        price = get_current_price(pos.symbol)
        if price:
            pos.current_price = price
            pos.unrealized_pnl = round((price - pos.avg_price) * pos.quantity, 2)
    db.commit()

    realized_pnl = (
        db.query(Trade)
        .with_entities(Trade.pnl)
        .filter(Trade.user_id == user.id)
        .all()
    )
    realized_pnl_value = round(sum(p[0] for p in realized_pnl), 2)
    unrealized_pnl_value = round(sum(p.unrealized_pnl for p in positions), 2)

    market_value = round(sum(p.current_price * p.quantity for p in positions), 2)
    equity = round(float(user.cash_balance) + market_value, 2)

    return {
        "starting_balance": round(float(user.starting_balance), 2),
        "cash_balance": round(float(user.cash_balance), 2),
        "market_value": market_value,
        "equity": equity,
        "realized_pnl": realized_pnl_value,
        "unrealized_pnl": unrealized_pnl_value,
        "positions": [
            {
                "id": p.id,
                "symbol": p.symbol,
                "quantity": p.quantity,
                "avg_price": round(p.avg_price, 2),
                "current_price": round(p.current_price, 2),
                "unrealized_pnl": round(p.unrealized_pnl, 2),
                "market_value": round(p.current_price * p.quantity, 2),
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in positions
        ],
    }

