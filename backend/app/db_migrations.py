from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine


def _sqlite_has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)  # row[1] is column name


def migrate(engine: Engine) -> None:
    """
    Lightweight migration helper (SQLite-friendly).
    This project doesn't use Alembic; we add missing columns safely.
    """
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        # Users: add balances if missing
        if not _sqlite_has_column(conn, "users", "starting_balance"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN starting_balance FLOAT NOT NULL DEFAULT 100000.0")
            )
        if not _sqlite_has_column(conn, "users", "cash_balance"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN cash_balance FLOAT NOT NULL DEFAULT 100000.0")
            )
        if not _sqlite_has_column(conn, "users", "updated_at"):
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME"))
        if not _sqlite_has_column(conn, "users", "role"):
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"))
        if not _sqlite_has_column(conn, "users", "is_trading_enabled"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN is_trading_enabled BOOLEAN NOT NULL DEFAULT 1")
            )
        if not _sqlite_has_column(conn, "users", "max_trade_amount"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN max_trade_amount FLOAT NOT NULL DEFAULT 5000.0")
            )
        if not _sqlite_has_column(conn, "users", "daily_loss_limit"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN daily_loss_limit FLOAT NOT NULL DEFAULT 5000.0")
            )
        if not _sqlite_has_column(conn, "users", "max_trades_per_day"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN max_trades_per_day INTEGER NOT NULL DEFAULT 20")
            )
        if not _sqlite_has_column(conn, "users", "last_login_at"):
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
        if not _sqlite_has_column(conn, "trades", "source"):
            conn.execute(text("ALTER TABLE trades ADD COLUMN source VARCHAR NOT NULL DEFAULT 'manual'"))
        if not _sqlite_has_column(conn, "trades", "notes"):
            conn.execute(text("ALTER TABLE trades ADD COLUMN notes VARCHAR"))

