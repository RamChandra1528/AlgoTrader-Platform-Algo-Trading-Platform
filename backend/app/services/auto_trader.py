import logging
from typing import List

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# List of popular stocks to screen
DEFAULT_WATCHLIST = [
    "AAPL", "GOOGL", "MSFT", "AMZN", "META", "TSLA", "NVDA", 
    "AMD", "NFLX", "JPM", "V", "JNJ", "WMT", "PG", "DIS"
]

def analyze_stock(symbol: str) -> dict:
    """Analyze a single stock and return technical signals and confidence score."""
    try:
        # Fetch 60 days of data
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="60d")
        
        if df.empty or len(df) < 30:
            return {"symbol": symbol, "status": "insufficient_data"}
            
        current_price = df['Close'].iloc[-1]
        
        # Calculate moving averages
        df['SMA_10'] = df['Close'].rolling(window=10).mean()
        df['SMA_30'] = df['Close'].rolling(window=30).mean()
        
        # Calculate RSI (14-period)
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Get latest values
        current_sma10 = df['SMA_10'].iloc[-1]
        current_sma30 = df['SMA_30'].iloc[-1]
        prev_sma10 = df['SMA_10'].iloc[-2]
        prev_sma30 = df['SMA_30'].iloc[-2]
        current_rsi = df['RSI'].iloc[-1]
        
        # Determine signals
        signal = "HOLD"
        confidence = 50.0
        reasons = []
        
        # 1. MA Crossover Logic
        if current_sma10 > current_sma30 and prev_sma10 <= prev_sma30:
            signal = "BUY"
            confidence += 30
            reasons.append("Bullish MA Crossover (10-day crossed above 30-day)")
        elif current_sma10 < current_sma30 and prev_sma10 >= prev_sma30:
            signal = "SELL"
            confidence += 30
            reasons.append("Bearish MA Crossover (10-day crossed below 30-day)")
        elif current_sma10 > current_sma30:
            # Uptrend
            if signal == "HOLD":
                signal = "BUY"
            confidence += 10
            reasons.append("Uptrend (10-day MA > 30-day MA)")
        elif current_sma10 < current_sma30:
            # Downtrend
            if signal == "HOLD":
                signal = "SELL"
            confidence += 10
            reasons.append("Downtrend (10-day MA < 30-day MA)")
            
        # 2. RSI Logic 
        if current_rsi < 30:
            signal = "BUY"
            confidence += 20
            reasons.append(f"Oversold (RSI: {current_rsi:.1f})")
        elif current_rsi > 70:
            if signal == "BUY":
                # Conflicting signals, reduce confidence
                confidence -= 20
                signal = "HOLD"
                reasons.append("Mixed signals (Uptrend but Overbought)")
            else:
                signal = "SELL"
                confidence += 20
                reasons.append(f"Overbought (RSI: {current_rsi:.1f})")
                
        # Cap confidence at 100
        confidence = min(confidence, 100.0)
        
        return {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "signal": signal,
            "confidence": round(confidence, 1),
            "reasons": reasons,
            "indicators": {
                "sma_10": round(current_sma10, 2),
                "sma_30": round(current_sma30, 2),
                "rsi_14": round(current_rsi, 2)
            },
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {e}")
        return {"symbol": symbol, "status": "error", "error": str(e)}

def screen_market(symbols: List[str] = None) -> List[dict]:
    """Scan list of ticker symbols and return ranked recommendations."""
    if not symbols:
        symbols = DEFAULT_WATCHLIST
        
    results = []
    for symbol in symbols:
        analysis = analyze_stock(symbol)
        if analysis.get("status") == "success":
            results.append(analysis)
            
    # Sort: BUYs first (highest confidence), then HOLDs, then SELLs (highest confidence)
    def sort_key(item):
        sig = item["signal"]
        conf = item["confidence"]
        if sig == "BUY":
            return (0, -conf)
        elif sig == "HOLD":
            return (1, -conf)
        else:
            return (2, -conf)
            
    ranked = sorted(results, key=sort_key)
    return ranked
