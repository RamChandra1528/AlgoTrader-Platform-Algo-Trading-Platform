# Copilot Instructions for Algorithmic Trading Platform

## Architecture Overview

This is a **full-stack algorithmic trading platform** with a modular, multi-service design:

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (port 3000)
- **Backend API**: FastAPI + SQLAlchemy + PostgreSQL (port 8000)
- **Execution Model**: Paper trading with backtester engine
- **Key Frameworks**: Backtrader (strategy execution), yfinance (data), JWT (auth)

### Core Data Flow
1. **Users authenticate** via `/api/auth` → JWT token stored in localStorage
2. **API requests** are routed through FastAPI with CORS from `localhost:3000`
3. **Strategies** stored in DB + registered in `STRATEGY_MAP` → executed by BacktestEngine
4. **Market data** fetched via yfinance → backtested or live-streamed
5. **Positions/PnL** calculated via `services.portfolio` → exposed in dashboard

## Key Code Patterns

### Backend API Structure (FastAPI)
- **Routers**: `app/api/{auth,strategies,backtests,dashboard,trading}.py`
- **Dependencies**: `get_db` (SQLAlchemy Session), `get_current_user` (JWT validation)
- **Response Models**: Pydantic schemas in `app/schemas/` for type validation
- **Database Models**: SQLAlchemy ORM in `app/models/`
- **Example**: Auth endpoints use `hash_password()` + `create_access_token()` from `core/security.py`

### Strategy Pattern (Backtrader)
All trading strategies inherit from `bt.Strategy`:
```python
# Register in app/engine/strategies/__init__.py STRATEGY_MAP
class MACrossoverStrategy(bt.Strategy):
    params = (("fast_period", 10), ("slow_period", 30))  # Tunable params
    def __init__(self):
        self.fast_ma = bt.indicators.SMA(...)
    def next(self):
        if self.crossover > 0:
            self.order = self.buy()
```
- Parameters **must** be tuples of tuples: `params = (("name", default),)`
- New strategies: add class + register in `STRATEGY_MAP` dict
- Backtest engine passes params via `cerebro.addstrategy(StrategyClass, **params)`

### Frontend API Client (axios)
- **Base setup**: `src/lib/api.ts` configures axios with `NEXT_PUBLIC_API_URL`
- **Interceptors**: auto-attach JWT token from localStorage; redirect to `/login` on 401
- **Usage**: `import { authApi, dashboardApi } from "@/lib/api"` then call `api.get()`, `api.post()`
- **TypeScript paths**: `@/*` maps to `src/*` (configured in `tsconfig.json`)

## Development Workflow

### Local Startup (Recommended Order)
```bash
# Terminal 1: Backend
cd backend && python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
set DATABASE_URL=postgresql://algotrader:algotrader_secret@localhost:5432/algotrading
uvicorn app.main:app --reload

# Terminal 2: Database (if not already running)
docker-compose up db

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

### Docker Compose (Full Stack)
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

### Database Queries
- Use `get_db` dependency to inject SQLAlchemy `Session`
- Example: `user = db.query(User).filter(User.email == email).first()`
- All models use `Base` from `app.database`

## Project-Specific Conventions

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection (required)
- `SECRET_KEY`: JWT signing key (change in production)
- `ALGORITHM`: JWT algorithm (default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: token TTL (default 30)
- Frontend: `NEXT_PUBLIC_API_URL` (must be prefixed with `NEXT_PUBLIC_`)

### API Response Structure
- **200 OK**: `{ "data": ... }` or direct model (Pydantic)
- **400 Bad Request**: `HTTPException(status_code=400, detail="message")`
- **401 Unauthorized**: triggered by missing/invalid JWT
- **FastAPI auto-generates** OpenAPI docs at `/docs` and `/redoc`

### Common Modifications
1. **Add endpoint**: create function in `api/{module}.py`, include router in `main.py`
2. **Add database model**: create class in `models/`, ensure `__tablename__` is unique
3. **Add schema**: mirror model in `schemas/`, use Pydantic `ConfigDict`
4. **Add strategy**: inherit `bt.Strategy`, register in `STRATEGY_MAP`, define `params` tuple
5. **Add frontend page**: create `src/app/{route}/page.tsx`, use `src/lib/api.ts` for requests

## Integration Points & Dependencies

- **Backtrader**: handles order execution, position management (abstraction over real brokers)
- **yfinance**: pulls historical market data; no API key needed but rate-limited
- **PostgreSQL**: stores users, strategies, backtests, trades, positions; health check in docker-compose
- **JWT (python-jose)**: stateless auth; tokens include user `id` in `sub` claim
- **SQLAlchemy 2.0**: ORM; uses `Base.metadata.create_all()` for schema creation (no migrations currently)

## Testing & Debugging

### Backend Tests
- No test files currently in repo; pytest setup recommended
- Run FastAPI with `--reload` for hot-reload during development
- Use Swagger UI (`/docs`) to test endpoints interactively

### Frontend Debugging
- Next.js dev server logs in terminal; check browser DevTools Network for API calls
- `localStorage` contains JWT token; clear it to force re-login
- API errors auto-redirect to `/login` on 401

### Common Issues
- **PostgreSQL connection fails**: ensure `DATABASE_URL` is set and DB is running
- **CORS errors**: frontend origin must be in `allow_origins` in `main.py`
- **yfinance rate limit**: add retry logic or cache results
- **Strategy won't backtest**: check `STRATEGY_MAP` registration and `params` tuple format

## Key Files by Task

| Task | Files |
|------|-------|
| Add auth endpoint | `api/auth.py`, `models/user.py`, `schemas/user.py`, `core/security.py` |
| Add backtest feature | `api/backtests.py`, `engine/backtester.py`, `models/backtest.py`, `schemas/backtest.py` |
| Add trading strategy | `engine/strategies/{new_strategy}.py`, `engine/strategies/__init__.py` (register) |
| Add dashboard widget | `frontend/src/app/page.tsx`, `src/lib/api.ts` (endpoint), `api/dashboard.py` (backend) |
| Configure environment | `.env` or env vars: `DATABASE_URL`, `SECRET_KEY`, `NEXT_PUBLIC_API_URL` |

