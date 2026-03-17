from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.position import Position
from app.models.backtest import Backtest
from app.schemas.backtest import DashboardSummary
from app.services.account import build_account_snapshot

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trades = db.query(Trade).filter(Trade.user_id == current_user.id).all()

    snapshot = build_account_snapshot(db, current_user)
    total_pnl = snapshot["realized_pnl"] + snapshot["unrealized_pnl"]
    winning_trades = [t for t in trades if t.pnl > 0]
    win_rate = (len(winning_trades) / len(trades) * 100) if trades else 0.0

    portfolio_value = snapshot["equity"]

    return DashboardSummary(
        total_pnl=round(total_pnl, 2),
        total_trades=len(trades),
        open_positions=len(snapshot["positions"]),
        portfolio_value=round(portfolio_value, 2),
        win_rate=round(win_rate, 2),
    )


@router.get("/equity-curve")
def get_equity_curve(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Build equity curve from trade history."""
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id)
        .order_by(Trade.executed_at)
        .all()
    )

    equity = 100000.0
    curve = [{"date": "Start", "value": equity}]
    for trade in trades:
        equity += trade.pnl
        curve.append({
            "date": trade.executed_at.strftime("%Y-%m-%d %H:%M"),
            "value": round(equity, 2),
        })

    return curve


@router.get("/positions")
def get_positions(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    positions = (
        db.query(Position).filter(Position.user_id == current_user.id).all()
    )
    return [
        {
            "id": p.id,
            "symbol": p.symbol,
            "quantity": p.quantity,
            "avg_price": round(p.avg_price, 2),
            "current_price": round(p.current_price, 2),
            "unrealized_pnl": round(p.unrealized_pnl, 2),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in positions
    ]
