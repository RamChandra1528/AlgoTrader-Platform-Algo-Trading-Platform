# Algorithmic Stock Trading Platform

A professional algorithmic trading platform with backtesting, paper trading, and real-time dashboard.

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS + Recharts
- **Backend**: FastAPI + SQLAlchemy
- **Database**: PostgreSQL
- **Trading Engine**: Backtrader + yfinance
- **Deployment**: Docker Compose

## Features

- JWT Authentication
- Interactive Dashboard (Equity Curve, PnL, Open Positions)
- Strategy Module (MA Crossover, RSI)
- Backtesting Engine with metrics (Return, Sharpe Ratio, Max Drawdown)
- Paper Trading Simulation

## Quick Start (Docker)

```bash
# Clone and navigate to project
cd algo-trading-platform

# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Default Admin Login: admin@algotrader.local / Admin@123
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt

# Set environment variables
set DATABASE_URL=postgresql://algotrader:algotrader_secret@localhost:5432/algotrading
set SECRET_KEY=dev-secret-key
set ADMIN_EMAIL=admin@algotrader.local
set ADMIN_PASSWORD=Admin@123

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
# Run PostgreSQL via Docker
docker-compose up db
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
algo-trading-platform/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Security & dependencies
│   │   ├── engine/       # Trading strategies & backtester
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── config.py     # App configuration
│   │   ├── database.py   # DB connection
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/          # Next.js pages
│       ├── components/   # React components
│       ├── lib/          # API client & auth
│       └── types/        # TypeScript types
├── docker-compose.yml
└── README.md
```

## Deployment

1. Update `.env.example` values and rename to `.env`
2. Change `SECRET_KEY` to a strong random string
3. Run `docker-compose up --build -d`
4. Access frontend at `http://localhost:3000`
