from typing import Optional

import yfinance as yf


def get_current_price(symbol: str) -> Optional[float]:
    """Fetch the current market price for a symbol using yfinance."""
    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period="1d")
        if hist.empty:
            return None
        return round(float(hist["Close"].iloc[-1]), 2)
    except Exception:
        return None


def get_historical_data(symbol: str, start: str, end: str):
    """Fetch historical OHLCV data."""
    try:
        df = yf.download(
            symbol.upper(),
            start=start,
            end=end,
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
        )
        if df.empty:
            return None
        return df
    except Exception:
        return None
