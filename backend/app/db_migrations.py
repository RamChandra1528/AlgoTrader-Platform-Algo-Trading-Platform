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

