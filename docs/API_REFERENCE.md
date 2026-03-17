# API Reference Documentation

## Overview

This document provides comprehensive API reference for the Algorithmic Trading Platform. All APIs use RESTful conventions and return JSON responses.

## Base URL

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://api.yourdomain.com/api/v1`

## Authentication

All API endpoints (except authentication endpoints) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "created_at": "2024-01-01T00:00:00Z",
      "is_active": true
    },
    "access_token": "jwt-token-string",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

#### Error Codes
- `EMAIL_ALREADY_EXISTS`: Email is already registered
- `INVALID_EMAIL`: Email format is invalid
- `WEAK_PASSWORD`: Password doesn't meet security requirements

---

### Login User

**POST** `/auth/login`

Authenticate user and return JWT token.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "access_token": "jwt-token-string",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "full_name": "John Doe"
    }
  }
}
```

#### Error Codes
- `INVALID_CREDENTIALS`: Email or password is incorrect
- `ACCOUNT_INACTIVE`: Account is deactivated

---

### Refresh Token

**POST** `/auth/refresh`

Refresh JWT token.

#### Request Headers
```
Authorization: Bearer <current-token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "access_token": "new-jwt-token",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

---

### Logout User

**POST** `/auth/logout`

Invalidate current JWT token.

#### Request Headers
```
Authorization: Bearer <jwt-token>
```

#### Response
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

---

## Market Data Endpoints

### Get Historical Data

**GET** `/market-data/{symbol}/historical`

Retrieve historical price data for a symbol.

#### Parameters
- `symbol` (path): Stock symbol (e.g., "AAPL", "GOOGL")
- `start_date` (query): Start date in YYYY-MM-DD format
- `end_date` (query): End date in YYYY-MM-DD format
- `interval` (query): Data interval ("1d", "1h", "5m") - default: "1d"

#### Example
```http
GET /market-data/AAPL/historical?start_date=2024-01-01&end_date=2024-01-31&interval=1d
Authorization: Bearer <jwt-token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "interval": "1d",
    "data": [
      {
        "date": "2024-01-01",
        "open": 150.25,
        "high": 152.50,
        "low": 149.75,
        "close": 151.80,
        "volume": 25000000
      }
    ]
  }
}
```

---

### Get Real-time Data

**GET** `/market-data/{symbol}/realtime`

Get real-time market data for a symbol.

#### Parameters
- `symbol` (path): Stock symbol

#### Example
```http
GET /market-data/AAPL/realtime
Authorization: Bearer <jwt-token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 152.45,
    "change": 1.25,
    "change_percent": 0.82,
    "volume": 1500000,
    "timestamp": "2024-01-01T15:30:00Z",
    "bid": 152.40,
    "ask": 152.50,
    "day_high": 153.00,
    "day_low": 150.50
  }
}
```

---

### Search Symbols

**GET** `/market-data/search`

Search for stock symbols.

#### Parameters
- `query` (query): Search term
- `limit` (query): Number of results (max: 50) - default: 10

#### Example
```http
GET /market-data/search?query=Apple&limit=5
Authorization: Bearer <jwt-token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "type": "stock"
      }
    ]
  }
}
```

---

## Strategy Endpoints

### Get All Strategies

**GET** `/strategies`

Get all available strategies.

#### Response
```json
{
  "success": true,
  "data": {
    "strategies": [
      {
        "id": "uuid-string",
        "name": "Moving Average Crossover",
        "type": "moving_average_crossover",
        "description": "Simple moving average crossover strategy",
        "parameters": {
          "fast_period": {
            "type": "integer",
            "default": 10,
            "min": 1,
            "max": 50,
            "description": "Fast moving average period"
          },
          "slow_period": {
            "type": "integer",
            "default": 20,
            "min": 1,
            "max": 100,
            "description": "Slow moving average period"
          }
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### Create Strategy Instance

**POST** `/strategies`

Create a new strategy instance.

#### Request Body
```json
{
  "name": "My MA Strategy",
  "type": "moving_average_crossover",
  "parameters": {
    "fast_period": 15,
    "slow_period": 30
  },
  "description": "Custom MA crossover strategy"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "My MA Strategy",
    "type": "moving_average_crossover",
    "parameters": {
      "fast_period": 15,
      "slow_period": 30
    },
    "status": "created",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Get Strategy Details

**GET** `/strategies/{strategy_id}`

Get details of a specific strategy.

#### Parameters
- `strategy_id` (path): Strategy UUID

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "My MA Strategy",
    "type": "moving_average_crossover",
    "parameters": {
      "fast_period": 15,
      "slow_period": 30
    },
    "status": "active",
    "performance": {
      "total_return": 12.5,
      "sharpe_ratio": 1.8,
      "max_drawdown": -5.2,
      "win_rate": 0.65
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

---

### Update Strategy

**PUT** `/strategies/{strategy_id}`

Update strategy parameters.

#### Request Body
```json
{
  "name": "Updated MA Strategy",
  "parameters": {
    "fast_period": 12,
    "slow_period": 26
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "Updated MA Strategy",
    "type": "moving_average_crossover",
    "parameters": {
      "fast_period": 12,
      "slow_period": 26
    },
    "updated_at": "2024-01-16T00:00:00Z"
  }
}
```

---

### Delete Strategy

**DELETE** `/strategies/{strategy_id}`

Delete a strategy.

#### Response
```json
{
  "success": true,
  "message": "Strategy deleted successfully"
}
```

---

## Backtesting Endpoints

### Run Backtest

**POST** `/backtest`

Run a backtest for a strategy.

#### Request Body
```json
{
  "strategy_id": "uuid-string",
  "symbol": "AAPL",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "initial_capital": 10000,
  "commission": 0.001,
  "slippage": 0.0001
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "backtest_id": "uuid-string",
    "status": "running",
    "estimated_completion": "2024-01-01T00:05:00Z"
  }
}
```

---

### Get Backtest Results

**GET** `/backtest/{backtest_id}`

Get results of a backtest.

#### Parameters
- `backtest_id` (path): Backtest UUID

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "strategy_id": "uuid-string",
    "symbol": "AAPL",
    "status": "completed",
    "performance": {
      "total_return": 15.2,
      "annual_return": 15.2,
      "sharpe_ratio": 1.85,
      "sortino_ratio": 2.1,
      "max_drawdown": -8.5,
      "calmar_ratio": 1.79,
      "win_rate": 0.62,
      "profit_factor": 1.8,
      "total_trades": 45,
      "winning_trades": 28,
      "losing_trades": 17
    },
    "equity_curve": [
      {
        "date": "2024-01-01",
        "equity": 10000,
        "returns": 0
      }
    ],
    "trades": [
      {
        "date": "2024-01-15",
        "type": "buy",
        "price": 150.25,
        "quantity": 66,
        "value": 9916.5
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:04:30Z"
  }
}
```

---

### Get Backtest List

**GET** `/backtest`

Get list of all backtests.

#### Parameters
- `strategy_id` (query): Filter by strategy ID
- `status` (query): Filter by status ("running", "completed", "failed")
- `limit` (query): Number of results - default: 20
- `offset` (query): Offset for pagination - default: 0

#### Response
```json
{
  "success": true,
  "data": {
    "backtests": [
      {
        "id": "uuid-string",
        "strategy_name": "MA Crossover",
        "symbol": "AAPL",
        "status": "completed",
        "total_return": 15.2,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Portfolio Endpoints

### Get Portfolio Overview

**GET** `/portfolio`

Get portfolio overview and summary.

#### Response
```json
{
  "success": true,
  "data": {
    "total_value": 12500.50,
    "cash_balance": 2500.50,
    "invested_value": 10000.00,
    "total_return": 25.05,
    "daily_return": 0.5,
    "daily_return_percent": 0.42,
    "positions_count": 5,
    "last_updated": "2024-01-01T15:30:00Z"
  }
}
```

---

### Get Positions

**GET** `/portfolio/positions`

Get all current positions.

#### Parameters
- `symbol` (query): Filter by symbol (optional)

#### Response
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "uuid-string",
        "symbol": "AAPL",
        "quantity": 50,
        "avg_cost": 150.25,
        "current_price": 152.45,
        "market_value": 7622.5,
        "unrealized_pnl": 110.0,
        "unrealized_pnl_percent": 1.46,
        "side": "long",
        "opened_at": "2024-01-01T10:30:00Z"
      }
    ]
  }
}
```

---

### Get Performance History

**GET** `/portfolio/performance`

Get portfolio performance history.

#### Parameters
- `period` (query): Time period ("1D", "1W", "1M", "3M", "6M", "1Y", "ALL")
- `granularity` (query): Data granularity ("1h", "1d") - default: "1d"

#### Example
```http
GET /portfolio/performance?period=1M&granularity=1d
Authorization: Bearer <jwt-token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "period": "1M",
    "granularity": "1d",
    "performance": [
      {
        "date": "2024-01-01",
        "portfolio_value": 10000.00,
        "returns": 0,
        "cumulative_returns": 0
      }
    ],
    "summary": {
      "total_return": 5.2,
      "volatility": 12.5,
      "sharpe_ratio": 1.65,
      "max_drawdown": -3.2
    }
  }
}
```

---

### Get Transaction History

**GET** `/portfolio/transactions`

Get transaction history.

#### Parameters
- `symbol` (query): Filter by symbol (optional)
- `type` (query): Filter by transaction type ("buy", "sell")
- `start_date` (query): Start date filter
- `end_date` (query): End date filter
- `limit` (query): Number of results - default: 50
- `offset` (query): Offset for pagination - default: 0

#### Response
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid-string",
        "symbol": "AAPL",
        "type": "buy",
        "quantity": 50,
        "price": 150.25,
        "total_value": 7512.5,
        "commission": 7.5,
        "timestamp": "2024-01-01T10:30:00Z",
        "status": "completed"
      }
    ],
    "total": 125,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Order Management Endpoints

### Place Order

**POST** `/orders`

Place a new order.

#### Request Body
```json
{
  "symbol": "AAPL",
  "type": "market",
  "side": "buy",
  "quantity": 50,
  "price": 150.25,
  "time_in_force": "day",
  "order_type": "regular"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "symbol": "AAPL",
    "type": "market",
    "side": "buy",
    "quantity": 50,
    "price": 150.25,
    "status": "submitted",
    "created_at": "2024-01-01T10:30:00Z"
  }
}
```

---

### Get Order Status

**GET** `/orders/{order_id}`

Get status of a specific order.

#### Parameters
- `order_id` (path): Order UUID

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "symbol": "AAPL",
    "type": "market",
    "side": "buy",
    "quantity": 50,
    "filled_quantity": 50,
    "average_price": 150.30,
    "status": "filled",
    "created_at": "2024-01-01T10:30:00Z",
    "filled_at": "2024-01-01T10:30:15Z",
    "commission": 7.5
  }
}
```

---

### Cancel Order

**DELETE** `/orders/{order_id}`

Cancel a pending order.

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "cancelled",
    "cancelled_at": "2024-01-01T10:35:00Z"
  }
}
```

---

### Get Order History

**GET** `/orders`

Get order history.

#### Parameters
- `symbol` (query): Filter by symbol (optional)
- `status` (query): Filter by status ("submitted", "filled", "cancelled", "rejected")
- `limit` (query): Number of results - default: 50
- `offset` (query): Offset for pagination - default: 0

#### Response
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid-string",
        "symbol": "AAPL",
        "type": "market",
        "side": "buy",
        "quantity": 50,
        "status": "filled",
        "created_at": "2024-01-01T10:30:00Z"
      }
    ],
    "total": 85,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Risk Management Endpoints

### Get Risk Metrics

**GET** `/risk/metrics`

Get current risk metrics for portfolio.

#### Response
```json
{
  "success": true,
  "data": {
    "portfolio_value": 12500.50,
    "var_95": -250.25,
    "var_99": -450.50,
    "beta": 1.2,
    "volatility": 0.15,
    "sharpe_ratio": 1.85,
    "max_drawdown": -8.5,
    "concentration_risk": 0.25,
    "sector_exposure": {
      "technology": 0.45,
      "healthcare": 0.20,
      "finance": 0.15,
      "other": 0.20
    },
    "position_limits": {
      "max_position_size": 5000,
      "max_sector_exposure": 0.30,
      "current_usage": {
        "max_position_size": 0.60,
        "max_sector_exposure": 0.45
      }
    }
  }
}
```

---

### Get Risk Alerts

**GET** `/risk/alerts`

Get active risk alerts.

#### Parameters
- `severity` (query): Filter by severity ("low", "medium", "high", "critical")
- `status` (query): Filter by status ("active", "acknowledged", "resolved")

#### Response
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid-string",
        "type": "position_limit",
        "severity": "medium",
        "message": "AAPL position exceeds 60% of max position size",
        "symbol": "AAPL",
        "current_value": 3000,
        "limit_value": 5000,
        "status": "active",
        "created_at": "2024-01-01T10:30:00Z"
      }
    ]
  }
}
```

---

### Update Risk Limits

**PUT** `/risk/limits`

Update risk management limits.

#### Request Body
```json
{
  "max_position_size": 10000,
  "max_sector_exposure": 0.40,
  "max_portfolio_var": 0.02,
  "stop_loss_threshold": -0.10
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "max_position_size": 10000,
    "max_sector_exposure": 0.40,
    "max_portfolio_var": 0.02,
    "stop_loss_threshold": -0.10,
    "updated_at": "2024-01-01T10:30:00Z"
  }
}
```

---

## WebSocket API

### Real-time Market Data

Connect to WebSocket for real-time market data updates.

#### Connection
```
ws://localhost:8000/ws/market-data
```

#### Authentication
Send JWT token as first message:
```json
{
  "type": "auth",
  "token": "your-jwt-token"
}
```

#### Subscribe to Symbol
```json
{
  "type": "subscribe",
  "symbol": "AAPL"
}
```

#### Real-time Updates
```json
{
  "type": "price_update",
  "symbol": "AAPL",
  "price": 152.45,
  "change": 1.25,
  "change_percent": 0.82,
  "volume": 1500000,
  "timestamp": "2024-01-01T15:30:00Z"
}
```

---

### Portfolio Updates

Connect to WebSocket for portfolio updates.

#### Connection
```
ws://localhost:8000/ws/portfolio
```

#### Portfolio Updates
```json
{
  "type": "portfolio_update",
  "total_value": 12550.75,
  "daily_return": 50.25,
  "daily_return_percent": 0.4,
  "positions": [
    {
      "symbol": "AAPL",
      "quantity": 50,
      "current_price": 152.45,
      "unrealized_pnl": 110.0
    }
  ],
  "timestamp": "2024-01-01T15:30:00Z"
}
```

---

## Error Codes

### Authentication Errors
- `INVALID_TOKEN`: JWT token is invalid or expired
- `TOKEN_EXPIRED`: JWT token has expired
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Validation Errors
- `INVALID_REQUEST`: Request format is invalid
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_VALUE`: Field value is invalid

### Business Logic Errors
- `INSUFFICIENT_FUNDS`: Not enough cash for order
- `INSUFFICIENT_POSITION`: Not enough shares to sell
- `MARKET_CLOSED`: Market is closed for trading
- `ORDER_NOT_FOUND`: Order does not exist
- `STRATEGY_NOT_FOUND`: Strategy does not exist

### System Errors
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Required service is unavailable
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `DATABASE_ERROR`: Database operation failed

---

## Rate Limits

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Market data endpoints**: 100 requests per minute
- **Trading endpoints**: 50 requests per minute
- **Portfolio endpoints**: 200 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## SDK Examples

### Python SDK
```python
from trading_platform_sdk import TradingPlatform

# Initialize client
client = TradingPlatform(
    base_url="http://localhost:8000/api/v1",
    token="your-jwt-token"
)

# Get portfolio
portfolio = client.get_portfolio()
print(f"Total value: ${portfolio.total_value}")

# Place order
order = client.place_order(
    symbol="AAPL",
    side="buy",
    quantity=50,
    type="market"
)
print(f"Order placed: {order.id}")
```

### JavaScript SDK
```javascript
import { TradingPlatform } from '@trading-platform/sdk';

// Initialize client
const client = new TradingPlatform({
  baseURL: 'http://localhost:8000/api/v1',
  token: 'your-jwt-token'
});

// Get portfolio
const portfolio = await client.getPortfolio();
console.log(`Total value: $${portfolio.totalValue}`);

// Place order
const order = await client.placeOrder({
  symbol: 'AAPL',
  side: 'buy',
  quantity: 50,
  type: 'market'
});
console.log(`Order placed: ${order.id}`);
```

---

## Testing

### API Testing with Postman

Import the Postman collection from `docs/postman-collection.json` to test all endpoints.

### Automated Testing

```bash
# Run API tests
npm run test:api

# Run integration tests
npm run test:integration
```

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- Market data endpoints
- Strategy management
- Backtesting functionality
- Portfolio management
- Order management
- Risk management
- WebSocket support

### v1.1.0 (2024-02-01)
- Added advanced order types
- Enhanced risk metrics
- Improved error handling
- Performance optimizations
