from sqlalchemy.orm import Session

from app.models.position import Position
from app.models.trade import Trade
from app.services.market_data import get_current_price


def refresh_positions(db: Session, user_id: int) -> None:
    """Update current prices and unrealized PnL for all positions."""
    positions = db.query(Position).filter(Position.user_id == user_id).all()
    for pos in positions:
        price = get_current_price(pos.symbol)
        if price:
            pos.current_price = price
            pos.unrealized_pnl = round((price - pos.avg_price) * pos.quantity, 2)
    db.commit()


def compute_total_pnl(db: Session, user_id: int) -> float:
    """Compute total realized PnL from all trades."""
    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    return round(sum(t.pnl for t in trades), 2)
