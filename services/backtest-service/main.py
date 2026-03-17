from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from typing import List, Dict, Any
from datetime import datetime

from .database import get_db, init_db
from .models import Backtest, BacktestResult
from .schemas import (
    BacktestCreate, BacktestResponse, BacktestUpdate,
    BacktestRequest, BacktestResultResponse
)
from .backtest_engine import BacktestEngine
from .performance_calculator import PerformanceCalculator

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Initialize backtest engine
    app.state.backtest_engine = BacktestEngine()
    app.state.performance_calculator = PerformanceCalculator()
    
    yield

app = FastAPI(
    title="Backtest Service",
    version="2.0.0",
    description="Advanced backtesting engine with performance analytics",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/backtest", response_model=List[BacktestResponse])
async def get_backtests(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_db)
):
    from sqlalchemy import select
    result = await db.execute(select(Backtest).offset(skip).limit(limit))
    backtests = result.scalars().all()
    return backtests

@app.post("/backtest", response_model=BacktestResponse)
async def create_backtest(
    backtest_data: BacktestCreate,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    backtest = Backtest(**backtest_data.dict())
    backtest.status = "pending"
    db.add(backtest)
    await db.commit()
    await db.refresh(backtest)
    
    # Start backtest in background
    background_tasks.add_task(
        run_backtest_job,
        backtest.id,
        backtest_data.dict()
    )
    
    logger.info("Backtest created and queued", backtest_id=backtest.id)
    return backtest

@app.get("/backtest/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(backtest_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    
    return backtest

@app.get("/backtest/{backtest_id}/results", response_model=BacktestResultResponse)
async def get_backtest_results(backtest_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    
    # Get backtest
    backtest_result = await db.execute(
        select(BacktestResult).where(BacktestResult.backtest_id == backtest_id)
    )
    result = backtest_result.scalar_one_or_none()
    
    if not result:
        raise HTTPException(status_code=404, detail="Backtest results not found")
    
    return result

@app.post("/backtest/run")
async def run_backtest(
    backtest_request: BacktestRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    """Run a backtest immediately"""
    try:
        # Create backtest record
        backtest = Backtest(
            name=f"Quick Backtest - {backtest_request.symbol}",
            strategy_id=backtest_request.strategy_id,
            symbol=backtest_request.symbol,
            start_date=backtest_request.start_date,
            end_date=backtest_request.end_date,
            initial_capital=backtest_request.initial_capital,
            parameters=backtest_request.parameters,
            status="running"
        )
        
        db.add(backtest)
        await db.commit()
        await db.refresh(backtest)
        
        # Run backtest in background
        background_tasks.add_task(
            run_backtest_job,
            backtest.id,
            backtest_request.dict()
        )
        
        logger.info("Quick backtest started", backtest_id=backtest.id)
        return {"message": "Backtest started", "backtest_id": backtest.id}
        
    except Exception as e:
        logger.error("Failed to start backtest", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start backtest: {str(e)}")

@app.get("/backtest/{backtest_id}/performance")
async def get_performance_metrics(backtest_id: int, db = Depends(get_db)):
    """Get detailed performance metrics for a backtest"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(BacktestResult).where(BacktestResult.backtest_id == backtest_id)
    )
    backtest_result = result.scalar_one_or_none()
    
    if not backtest_result:
        raise HTTPException(status_code=404, detail="Backtest results not found")
    
    # Calculate additional metrics
    performance_calculator = PerformanceCalculator()
    detailed_metrics = await performance_calculator.calculate_detailed_metrics(
        backtest_result.trades,
        backtest_result.equity_curve,
        backtest_result.initial_capital
    )
    
    return {
        "basic_metrics": {
            "total_return": backtest_result.total_return,
            "sharpe_ratio": backtest_result.sharpe_ratio,
            "sortino_ratio": backtest_result.sortino_ratio,
            "max_drawdown": backtest_result.max_drawdown,
            "win_rate": backtest_result.win_rate,
            "profit_factor": backtest_result.profit_factor,
            "cagr": backtest_result.cagr
        },
        "detailed_metrics": detailed_metrics
    }

@app.get("/backtest/{backtest_id}/chart")
async def get_backtest_chart(backtest_id: int, db = Depends(get_db)):
    """Get chart data for backtest visualization"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(BacktestResult).where(BacktestResult.backtest_id == backtest_id)
    )
    backtest_result = result.scalar_one_or_none()
    
    if not backtest_result:
        raise HTTPException(status_code=404, detail="Backtest results not found")
    
    # Prepare chart data
    chart_data = {
        "equity_curve": backtest_result.equity_curve,
        "drawdown_periods": backtest_result.drawdown_periods,
        "monthly_returns": backtest_result.monthly_returns,
        "trade_distribution": backtest_result.trade_distribution
    }
    
    return chart_data

@app.delete("/backtest/{backtest_id}")
async def delete_backtest(backtest_id: int, db = Depends(get_db)):
    """Delete a backtest and its results"""
    from sqlalchemy import delete
    
    # Delete backtest results
    await db.execute(
        delete(BacktestResult).where(BacktestResult.backtest_id == backtest_id)
    )
    
    # Delete backtest
    await db.execute(
        delete(Backtest).where(Backtest.id == backtest_id)
    )
    
    await db.commit()
    
    logger.info("Backtest deleted", backtest_id=backtest_id)
    return {"message": "Backtest deleted successfully"}

async def run_backtest_job(backtest_id: int, backtest_config: Dict[str, Any]):
    """Background task to run backtest"""
    try:
        engine = app.state.backtest_engine
        calculator = app.state.performance_calculator
        
        # Update status to running
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
            backtest = result.scalar_one_or_none()
            
            if backtest:
                backtest.status = "running"
                await db.commit()
        
        # Run backtest
        backtest_result = await engine.run_backtest(backtest_config)
        
        # Calculate performance metrics
        performance_metrics = await calculator.calculate_performance_metrics(
            backtest_result["trades"],
            backtest_result["equity_curve"],
            backtest_config["initial_capital"]
        )
        
        # Save results
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
            backtest = result.scalar_one_or_none()
            
            if backtest:
                backtest.status = "completed"
                backtest.completed_at = datetime.utcnow()
                
                # Create backtest result record
                db_result = BacktestResult(
                    backtest_id=backtest_id,
                    total_return=performance_metrics["total_return"],
                    sharpe_ratio=performance_metrics["sharpe_ratio"],
                    sortino_ratio=performance_metrics["sortino_ratio"],
                    max_drawdown=performance_metrics["max_drawdown"],
                    win_rate=performance_metrics["win_rate"],
                    profit_factor=performance_metrics["profit_factor"],
                    cagr=performance_metrics["cagr"],
                    total_trades=performance_metrics["total_trades"],
                    winning_trades=performance_metrics["winning_trades"],
                    losing_trades=performance_metrics["losing_trades"],
                    equity_curve=backtest_result["equity_curve"],
                    trades=backtest_result["trades"],
                    drawdown_periods=backtest_result.get("drawdown_periods", []),
                    monthly_returns=backtest_result.get("monthly_returns", []),
                    trade_distribution=backtest_result.get("trade_distribution", [])
                )
                
                db.add(db_result)
                await db.commit()
        
        logger.info("Backtest completed", backtest_id=backtest_id)
        
    except Exception as e:
        logger.error("Backtest job failed", backtest_id=backtest_id, error=str(e))
        
        # Update status to failed
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
            backtest = result.scalar_one_or_none()
            
            if backtest:
                backtest.status = "failed"
                backtest.error_message = str(e)
                await db.commit()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "backtest",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    from .database import AsyncSessionLocal
    from sqlalchemy import select
    
    uvicorn.run(app, host="0.0.0.0", port=8004)
