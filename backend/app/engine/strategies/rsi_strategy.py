import backtrader as bt


class RSIStrategy(bt.Strategy):
    """
    RSI Mean Reversion Strategy.
    Buys when RSI drops below oversold level, sells when RSI rises above overbought.
    """

    params = (
        ("rsi_period", 14),
        ("overbought", 70),
        ("oversold", 30),
    )

    def __init__(self):
        self.rsi = bt.indicators.RSI(
            self.data.close, period=self.params.rsi_period
        )
        self.order = None
        self.trade_log = []

    def notify_order(self, order):
        if order.status in [order.Completed]:
            self.trade_log.append(
                {
                    "date": self.data.datetime.date(0).isoformat(),
                    "side": "buy" if order.isbuy() else "sell",
                    "price": round(order.executed.price, 2),
                    "size": abs(order.executed.size),
                }
            )
        self.order = None

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.rsi < self.params.oversold:
                self.order = self.buy()
        elif self.rsi > self.params.overbought:
            self.order = self.sell()
