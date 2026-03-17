import backtrader as bt


class MACrossoverStrategy(bt.Strategy):
    """
    Moving Average Crossover Strategy.
    Buys when fast MA crosses above slow MA, sells when it crosses below.
    """

    params = (
        ("fast_period", 10),
        ("slow_period", 30),
    )

    def __init__(self):
        self.fast_ma = bt.indicators.SMA(
            self.data.close, period=self.params.fast_period
        )
        self.slow_ma = bt.indicators.SMA(
            self.data.close, period=self.params.slow_period
        )
        self.crossover = bt.indicators.CrossOver(self.fast_ma, self.slow_ma)
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
            if self.crossover > 0:
                self.order = self.buy()
        elif self.crossover < 0:
            self.order = self.sell()
