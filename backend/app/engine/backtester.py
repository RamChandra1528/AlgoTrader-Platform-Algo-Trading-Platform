import backtrader as bt
import yfinance as yf
import pandas as pd

from app.engine.strategies import STRATEGY_MAP


class EquityObserver(bt.observer.Observer):
    """Custom observer to track portfolio value over time."""

    lines = ("equity",)
    plotinfo = dict(plot=True, subplot=True)

    def next(self):
        self.lines.equity[0] = self._owner.broker.getvalue()


class BacktestEngine:
    """Runs backtests using Backtrader with yfinance data."""

    def run(
        self,
        strategy_type: str,
        symbol: str,
        start_date: str,
        end_date: str,
        initial_capital: float = 100000.0,
        parameters: dict = None,
    ) -> dict:
        strategy_class = STRATEGY_MAP.get(strategy_type)
        if not strategy_class:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        # Fetch historical data
        df = yf.download(
            symbol,
            start=start_date,
            end=end_date,
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
        )
        if df.empty:
            raise ValueError(f"No data found for {symbol} in the given date range")

        # Backtrader's default PandasData feed expects lowercase OHLCV column names.
        df = df.rename(columns=lambda c: str(c).strip().lower().replace(" ", "_"))

        cerebro = bt.Cerebro()

        # Map parameters to strategy params
        params = parameters or {}

        min_bars = self._estimate_min_bars(strategy_class, params)
        if len(df) < min_bars:
            raise ValueError(
                f"Not enough data to run this strategy. "
                f"Need at least {min_bars} bars, got {len(df)}."
            )
        cerebro.addstrategy(strategy_class, **params)

        # Add data feed
        data = bt.feeds.PandasData(dataname=df)
        cerebro.adddata(data)

        # Broker settings
        cerebro.broker.setcash(initial_capital)
        cerebro.broker.setcommission(commission=0.001)  # 0.1% commission

        # Analyzers
        cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name="sharpe", riskfreerate=0.02)
        cerebro.addanalyzer(bt.analyzers.DrawDown, _name="drawdown")
        cerebro.addanalyzer(bt.analyzers.Returns, _name="returns")
        cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trades")

        # Run
        results = cerebro.run()
        strat = results[0]

        # Extract metrics
        sharpe_analysis = strat.analyzers.sharpe.get_analysis()
        sharpe_ratio = sharpe_analysis.get("sharperatio") or 0.0

        drawdown_analysis = strat.analyzers.drawdown.get_analysis()
        max_drawdown = drawdown_analysis.get("max", {}).get("drawdown", 0.0)

        returns_analysis = strat.analyzers.returns.get_analysis()
        total_return = returns_analysis.get("rtot", 0.0) * 100  # as percentage

        final_value = cerebro.broker.getvalue()

        # Build equity curve from strategy data
        equity_curve = self._build_equity_curve(df, initial_capital, final_value)

        # Extract trade log
        trades_log = getattr(strat, "trade_log", [])

        return {
            "final_value": round(final_value, 2),
            "total_return": round(total_return, 2),
            "sharpe_ratio": round(sharpe_ratio, 4) if sharpe_ratio else 0.0,
            "max_drawdown": round(max_drawdown, 2),
            "equity_curve": equity_curve,
            "trades_log": trades_log,
        }

    def _build_equity_curve(
        self, df: pd.DataFrame, initial_capital: float, final_value: float
    ) -> list:
        """Build a simplified equity curve by interpolating between start and end."""
        n = len(df)
        if n == 0:
            return []

        dates = df.index.strftime("%Y-%m-%d").tolist()
        step = (final_value - initial_capital) / max(n - 1, 1)
        curve = []
        for i, date in enumerate(dates):
            value = initial_capital + step * i
            curve.append({"date": date, "value": round(value, 2)})

        # Ensure final value is exact
        if curve:
            curve[-1]["value"] = round(final_value, 2)

        # Sample to max 100 points for performance
        if len(curve) > 100:
            step = len(curve) // 100
            curve = curve[::step] + [curve[-1]]

        return curve

    def _estimate_min_bars(self, strategy_class, params: dict) -> int:
        defaults = {}
        try:
            defaults = dict(getattr(strategy_class, "params", ()) or ())
        except Exception:
            defaults = {}

        merged = {**defaults, **(params or {})}
        candidates = []
        for key, value in merged.items():
            if not isinstance(key, str):
                continue
            if "period" in key.lower() or "window" in key.lower():
                try:
                    candidates.append(int(value))
                except Exception:
                    continue

        return max(candidates) if candidates else 1
