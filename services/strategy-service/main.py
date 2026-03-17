from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from typing import List, Dict, Any
import importlib.util
import os

from .database import get_db, init_db
from .models import Strategy, StrategyInstance
from .schemas import (
    StrategyCreate, StrategyResponse, StrategyUpdate,
    StrategyInstanceCreate, StrategyInstanceResponse,
    StrategyExecutionRequest, StrategyExecutionResult
)
from .strategy_loader import StrategyLoader
from .strategy_executor import StrategyExecutor

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Initialize strategy loader
    app.state.strategy_loader = StrategyLoader()
    app.state.strategy_executor = StrategyExecutor()
    
    # Load built-in strategies
    await app.state.strategy_loader.load_builtin_strategies()
    
    yield

app = FastAPI(
    title="Strategy Service",
    version="2.0.0",
    description="Trading strategy management and execution service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/strategy", response_model=List[StrategyResponse])
async def get_strategies(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_db)
):
    from sqlalchemy import select
    result = await db.execute(select(Strategy).offset(skip).limit(limit))
    strategies = result.scalars().all()
    return strategies

@app.post("/strategy", response_model=StrategyResponse)
async def create_strategy(
    strategy_data: StrategyCreate,
    db = Depends(get_db)
):
    strategy = Strategy(**strategy_data.dict())
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    
    logger.info("Strategy created", strategy_id=strategy.id, name=strategy.name)
    return strategy

@app.get("/strategy/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(strategy_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    return strategy

@app.put("/strategy/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    strategy_update: StrategyUpdate,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    update_data = strategy_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(strategy, field, value)
    
    await db.commit()
    await db.refresh(strategy)
    
    logger.info("Strategy updated", strategy_id=strategy.id)
    return strategy

@app.post("/strategy/upload")
async def upload_strategy_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.py'):
        raise HTTPException(status_code=400, detail="Only Python files are allowed")
    
    # Save uploaded file
    upload_dir = "strategies/custom"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Load and validate strategy
    try:
        strategy_info = await app.state.strategy_loader.load_custom_strategy(file_path)
        logger.info("Custom strategy uploaded", filename=file.filename)
        return {"message": "Strategy uploaded successfully", "strategy": strategy_info}
    except Exception as e:
        # Remove invalid file
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid strategy file: {str(e)}")

@app.get("/strategy/available")
async def get_available_strategies():
    strategies = await app.state.strategy_loader.get_available_strategies()
    return {"strategies": strategies}

@app.post("/strategy/execute")
async def execute_strategy(
    execution_request: StrategyExecutionRequest,
    db = Depends(get_db)
):
    try:
        result = await app.state.strategy_executor.execute_strategy(
            execution_request.dict()
        )
        logger.info("Strategy executed", strategy_id=execution_request.strategy_id)
        return result
    except Exception as e:
        logger.error("Strategy execution failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

@app.get("/strategy/instances", response_model=List[StrategyInstanceResponse])
async def get_strategy_instances(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_db)
):
    from sqlalchemy import select
    result = await db.execute(select(StrategyInstance).offset(skip).limit(limit))
    instances = result.scalars().all()
    return instances

@app.post("/strategy/instances", response_model=StrategyInstanceResponse)
async def create_strategy_instance(
    instance_data: StrategyInstanceCreate,
    db = Depends(get_db)
):
    instance = StrategyInstance(**instance_data.dict())
    db.add(instance)
    await db.commit()
    await db.refresh(instance)
    
    logger.info("Strategy instance created", instance_id=instance.id)
    return instance

@app.post("/strategy/instances/{instance_id}/start")
async def start_strategy_instance(instance_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    
    result = await db.execute(select(StrategyInstance).where(StrategyInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Strategy instance not found")
    
    if instance.status != "stopped":
        raise HTTPException(status_code=400, detail="Strategy instance is already running")
    
    # Start strategy execution
    await app.state.strategy_executor.start_instance(instance)
    
    instance.status = "running"
    await db.commit()
    
    logger.info("Strategy instance started", instance_id=instance_id)
    return {"message": "Strategy instance started"}

@app.post("/strategy/instances/{instance_id}/stop")
async def stop_strategy_instance(instance_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    
    result = await db.execute(select(StrategyInstance).where(StrategyInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Strategy instance not found")
    
    if instance.status != "running":
        raise HTTPException(status_code=400, detail="Strategy instance is not running")
    
    # Stop strategy execution
    await app.state.strategy_executor.stop_instance(instance)
    
    instance.status = "stopped"
    await db.commit()
    
    logger.info("Strategy instance stopped", instance_id=instance_id)
    return {"message": "Strategy instance stopped"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "strategy",
        "version": "2.0.0",
        "loaded_strategies": len(await app.state.strategy_loader.get_available_strategies())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
