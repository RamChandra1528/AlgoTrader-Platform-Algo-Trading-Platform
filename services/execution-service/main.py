from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from typing import List, Dict, Any
from datetime import datetime

from .database import get_db, init_db
from .models import Order, Position, Execution
from .schemas import (
    OrderCreate, OrderResponse, OrderUpdate,
    PositionResponse, ExecutionResponse,
    OrderRequest, ExecutionResult
)
from .order_executor import OrderExecutor
from .position_manager import PositionManager
from .brokerage_simulator import BrokerageSimulator

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Initialize execution components
    app.state.order_executor = OrderExecutor()
    app.state.position_manager = PositionManager()
    app.state.brokerage_simulator = BrokerageSimulator()
    
    yield

app = FastAPI(
    title="Execution Service",
    version="2.0.0",
    description="Trade execution and position management service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    query = select(Order).offset(skip).limit(limit)
    if status:
        query = query.where(Order.status == status)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    return orders

@app.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    # Create order record
    order = Order(**order_data.dict())
    order.status = "pending"
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    # Execute order in background
    background_tasks.add_task(execute_order_job, order.id)
    
    logger.info("Order created and queued", order_id=order.id)
    return order

@app.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@app.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    await db.commit()
    await db.refresh(order)
    
    logger.info("Order updated", order_id=order_id)
    return order

@app.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ["pending", "submitted"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")
    
    order.status = "cancelled"
    await db.commit()
    
    logger.info("Order cancelled", order_id=order_id)
    return {"message": "Order cancelled successfully"}

@app.post("/orders/bulk", response_model=List[OrderResponse])
async def create_bulk_orders(
    orders: List[OrderCreate],
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    created_orders = []
    
    for order_data in orders:
        order = Order(**order_data.dict())
        order.status = "pending"
        db.add(order)
        created_orders.append(order)
    
    await db.commit()
    
    # Execute orders in background
    for order in created_orders:
        background_tasks.add_task(execute_order_job, order.id)
    
    logger.info("Bulk orders created", count=len(created_orders))
    return created_orders

@app.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    skip: int = 0,
    limit: int = 100,
    symbol: str = None,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    query = select(Position).offset(skip).limit(limit)
    if symbol:
        query = query.where(Position.symbol == symbol)
    
    result = await db.execute(query)
    positions = result.scalars().all()
    return positions

@app.get("/positions/{position_id}", response_model=PositionResponse)
async def get_position(position_id: int, db = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Position).where(Position.id == position_id))
    position = result.scalar_one_or_none()
    
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    return position

@app.get("/executions", response_model=List[ExecutionResponse])
async def get_executions(
    skip: int = 0,
    limit: int = 100,
    order_id: int = None,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    query = select(Execution).offset(skip).limit(limit)
    if order_id:
        query = query.where(Execution.order_id == order_id)
    
    result = await db.execute(query)
    executions = result.scalars().all()
    return executions

@app.post("/execute", response_model=ExecutionResult)
async def execute_strategy_order(
    order_request: OrderRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    """Execute an order from strategy service"""
    try:
        # Create order
        order = Order(
            strategy_instance_id=order_request.strategy_instance_id,
            symbol=order_request.symbol,
            side=order_request.side,
            order_type=order_request.order_type,
            quantity=order_request.quantity,
            price=order_request.price,
            time_in_force=order_request.time_in_force,
            status="pending"
        )
        
        db.add(order)
        await db.commit()
        await db.refresh(order)
        
        # Execute order in background
        background_tasks.add_task(execute_order_job, order.id)
        
        logger.info("Strategy order created", order_id=order.id)
        return ExecutionResult(
            success=True,
            order_id=order.id,
            message="Order submitted for execution"
        )
        
    except Exception as e:
        logger.error("Failed to execute strategy order", error=str(e))
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

@app.get("/portfolio/summary")
async def get_portfolio_summary(db = Depends(get_db)):
    """Get portfolio summary including positions and P&L"""
    from sqlalchemy import select, func
    
    # Get total positions
    positions_result = await db.execute(select(Position))
    positions = positions_result.scalars().all()
    
    # Calculate portfolio metrics
    total_market_value = sum(p.market_value for p in positions)
    total_cost_basis = sum(p.cost_basis for p in positions)
    total_pnl = sum(p.unrealized_pnl for p in positions)
    
    # Get today's executions
    today = datetime.utcnow().date()
    executions_result = await db.execute(
        select(Execution).where(Execution.execution_time >= today)
    )
    today_executions = executions_result.scalars().all()
    
    return {
        "total_market_value": total_market_value,
        "total_cost_basis": total_cost_basis,
        "total_unrealized_pnl": total_pnl,
        "total_realized_pnl": sum(e.realized_pnl for e in today_executions),
        "number_of_positions": len(positions),
        "today_executions": len(today_executions),
        "positions": [
            {
                "symbol": p.symbol,
                "quantity": p.quantity,
                "market_value": p.market_value,
                "unrealized_pnl": p.unrealized_pnl,
                "unrealized_pnl_percent": p.unrealized_pnl_percent
            }
            for p in positions
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "execution",
        "version": "2.0.0"
    }

async def execute_order_job(order_id: int):
    """Background task to execute order"""
    try:
        executor = app.state.order_executor
        position_manager = app.state.position_manager
        brokerage_sim = app.state.brokerage_simulator
        
        # Get order
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            
            if not order:
                logger.error("Order not found for execution", order_id=order_id)
                return
            
            # Update order status
            order.status = "submitted"
            await db.commit()
        
        # Execute order through brokerage simulator
        execution_result = await brokerage_sim.execute_order(order)
        
        # Create execution record
        async with AsyncSessionLocal() as db:
            execution = Execution(
                order_id=order_id,
                symbol=order.symbol,
                side=order.side,
                quantity=execution_result["executed_quantity"],
                price=execution_result["executed_price"],
                commission=execution_result["commission"],
                slippage=execution_result["slippage"],
                execution_time=datetime.utcnow(),
                status="filled"
            )
            
            db.add(execution)
            
            # Update order status
            order.status = "filled"
            order.filled_quantity = execution_result["executed_quantity"]
            order.filled_price = execution_result["executed_price"]
            order.commission = execution_result["commission"]
            
            await db.commit()
        
        # Update positions
        await position_manager.update_position(execution)
        
        logger.info("Order executed successfully", 
                   order_id=order_id, 
                   executed_quantity=execution_result["executed_quantity"],
                   executed_price=execution_result["executed_price"])
        
    except Exception as e:
        logger.error("Order execution failed", order_id=order_id, error=str(e))
        
        # Update order status to failed
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            
            if order:
                order.status = "failed"
                order.error_message = str(e)
                await db.commit()

if __name__ == "__main__":
    import uvicorn
    from .database import AsyncSessionLocal
    from sqlalchemy import select
    
    uvicorn.run(app, host="0.0.0.0", port=8005)
