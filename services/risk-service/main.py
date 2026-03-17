from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from typing import List, Dict, Any
from datetime import datetime

from .database import get_db, init_db
from .models import RiskLimit, RiskAlert, RiskMetrics
from .schemas import (
    RiskLimitCreate, RiskLimitResponse, RiskLimitUpdate,
    RiskAlertResponse, RiskMetricsResponse,
    RiskCheckRequest, RiskCheckResponse,
    RiskConfiguration
)
from .risk_engine import RiskEngine
from .risk_monitor import RiskMonitor

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Initialize risk components
    app.state.risk_engine = RiskEngine()
    app.state.risk_monitor = RiskMonitor()
    
    # Start risk monitoring
    await app.state.risk_monitor.start_monitoring()
    
    yield
    
    # Stop risk monitoring
    await app.state.risk_monitor.stop_monitoring()

app = FastAPI(
    title="Risk Management Service",
    version="2.0.0",
    description="Advanced risk management and monitoring service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Risk Limits Management
@app.get("/risk/limits", response_model=List[RiskLimitResponse])
async def get_risk_limits(
    skip: int = 0,
    limit: int = 100,
    user_id: int = None,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    query = select(RiskLimit).offset(skip).limit(limit)
    if user_id:
        query = query.where(RiskLimit.user_id == user_id)
    
    result = await db.execute(query)
    limits = result.scalars().all()
    return limits

@app.post("/risk/limits", response_model=RiskLimitResponse)
async def create_risk_limit(
    limit_data: RiskLimitCreate,
    db = Depends(get_db)
):
    risk_limit = RiskLimit(**limit_data.dict())
    db.add(risk_limit)
    await db.commit()
    await db.refresh(risk_limit)
    
    logger.info("Risk limit created", limit_id=risk_limit.id, type=risk_limit.limit_type)
    return risk_limit

@app.put("/risk/limits/{limit_id}", response_model=RiskLimitResponse)
async def update_risk_limit(
    limit_id: int,
    limit_update: RiskLimitUpdate,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    result = await db.execute(select(RiskLimit).where(RiskLimit.id == limit_id))
    limit = result.scalar_one_or_none()
    
    if not limit:
        raise HTTPException(status_code=404, detail="Risk limit not found")
    
    update_data = limit_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(limit, field, value)
    
    await db.commit()
    await db.refresh(limit)
    
    logger.info("Risk limit updated", limit_id=limit_id)
    return limit

@app.delete("/risk/limits/{limit_id}")
async def delete_risk_limit(limit_id: int, db = Depends(get_db)):
    from sqlalchemy import delete
    
    await db.execute(delete(RiskLimit).where(RiskLimit.id == limit_id))
    await db.commit()
    
    logger.info("Risk limit deleted", limit_id=limit_id)
    return {"message": "Risk limit deleted successfully"}

# Risk Assessment
@app.post("/risk/check", response_model=RiskCheckResponse)
async def check_order_risk(
    risk_request: RiskCheckRequest,
    db = Depends(get_db)
):
    """Check if order complies with risk limits"""
    try:
        risk_engine = app.state.risk_engine
        
        # Perform risk assessment
        risk_result = await risk_engine.assess_order_risk(risk_request.dict())
        
        # Create risk alert if needed
        if risk_result["risk_level"] in ["high", "critical"]:
            await _create_risk_alert(risk_request, risk_result, db)
        
        return RiskCheckResponse(**risk_result)
        
    except Exception as e:
        logger.error("Risk check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")

@app.post("/risk/portfolio-assessment")
async def assess_portfolio_risk(
    user_id: int,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    """Perform comprehensive portfolio risk assessment"""
    try:
        # Start portfolio risk assessment in background
        background_tasks.add_task(
            run_portfolio_risk_assessment,
            user_id
        )
        
        return {"message": "Portfolio risk assessment started"}
        
    except Exception as e:
        logger.error("Portfolio risk assessment failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")

@app.get("/risk/metrics", response_model=List[RiskMetricsResponse])
async def get_risk_metrics(
    user_id: int = None,
    symbol: str = None,
    from_date: datetime = None,
    to_date: datetime = None,
    db = Depends(get_db)
):
    """Get risk metrics for analysis"""
    from sqlalchemy import select
    
    query = select(RiskMetrics)
    
    if user_id:
        query = query.where(RiskMetrics.user_id == user_id)
    if symbol:
        query = query.where(RiskMetrics.symbol == symbol)
    if from_date:
        query = query.where(RiskMetrics.timestamp >= from_date)
    if to_date:
        query = query.where(RiskMetrics.timestamp <= to_date)
    
    query = query.order_by(RiskMetrics.timestamp.desc())
    
    result = await db.execute(query)
    metrics = result.scalars().all()
    return metrics

@app.get("/risk/alerts", response_model=List[RiskAlertResponse])
async def get_risk_alerts(
    skip: int = 0,
    limit: int = 100,
    severity: str = None,
    status: str = None,
    user_id: int = None,
    db = Depends(get_db)
):
    """Get risk alerts"""
    from sqlalchemy import select
    
    query = select(RiskAlert).offset(skip).limit(limit)
    
    if severity:
        query = query.where(RiskAlert.severity == severity)
    if status:
        query = query.where(RiskAlert.status == status)
    if user_id:
        query = query.where(RiskAlert.user_id == user_id)
    
    query = query.order_by(RiskAlert.created_at.desc())
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    return alerts

@app.post("/risk/alerts/{alert_id}/acknowledge")
async def acknowledge_risk_alert(alert_id: int, db = Depends(get_db)):
    """Acknowledge and resolve risk alert"""
    from sqlalchemy import select
    
    result = await db.execute(select(RiskAlert).where(RiskAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")
    
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    
    logger.info("Risk alert acknowledged", alert_id=alert_id)
    return {"message": "Risk alert acknowledged"}

@app.get("/risk/configuration")
async def get_risk_configuration(db = Depends(get_db)):
    """Get current risk configuration"""
    from sqlalchemy import select
    
    # Get active risk limits
    result = await db.execute(select(RiskLimit).where(RiskLimit.is_active == True))
    limits = result.scalars().all()
    
    # Organize by type
    configuration = {
        "position_limits": {},
        "portfolio_limits": {},
        "execution_limits": {},
        "volatility_limits": {}
    }
    
    for limit in limits:
        config_type = f"{limit.limit_type}_limits"
        if config_type in configuration:
            configuration[config_type][limit.metric] = {
                "limit_value": limit.limit_value,
                "current_value": limit.current_value,
                "threshold_warning": limit.threshold_warning,
                "threshold_critical": limit.threshold_critical
            }
    
    return configuration

@app.post("/risk/configuration")
async def update_risk_configuration(
    configuration: RiskConfiguration,
    db = Depends(get_db)
):
    """Update risk configuration"""
    try:
        # Update or create risk limits based on configuration
        for limit_type, limits in configuration.dict().items():
            for metric, config in limits.items():
                await _update_or_create_limit(limit_type, metric, config, db)
        
        logger.info("Risk configuration updated")
        return {"message": "Risk configuration updated successfully"}
        
    except Exception as e:
        logger.error("Failed to update risk configuration", error=str(e))
        raise HTTPException(status_code=500, detail=f"Configuration update failed: {str(e)}")

@app.get("/risk/dashboard")
async def get_risk_dashboard(db = Depends(get_db)):
    """Get comprehensive risk dashboard data"""
    try:
        risk_monitor = app.state.risk_monitor
        
        # Get current risk metrics
        current_metrics = await risk_monitor.get_current_metrics()
        
        # Get recent alerts
        from sqlalchemy import select
        recent_alerts_result = await db.execute(
            select(RiskAlert).order_by(RiskAlert.created_at.desc()).limit(10)
        )
        recent_alerts = recent_alerts_result.scalars().all()
        
        # Get risk limits status
        limits_result = await db.execute(select(RiskLimit).where(RiskLimit.is_active == True))
        limits = limits_result.scalars().all()
        
        # Calculate risk summary
        risk_summary = await _calculate_risk_summary(limits, current_metrics)
        
        return {
            "risk_summary": risk_summary,
            "current_metrics": current_metrics,
            "recent_alerts": recent_alerts,
            "risk_limits": [
                {
                    "metric": limit.metric,
                    "limit_value": limit.limit_value,
                    "current_value": limit.current_value,
                    "utilization": limit.current_value / limit.limit_value if limit.limit_value > 0 else 0,
                    "status": _get_limit_status(limit)
                }
                for limit in limits
            ]
        }
        
    except Exception as e:
        logger.error("Failed to generate risk dashboard", error=str(e))
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "risk",
        "version": "2.0.0"
    }

# Helper functions
async def _create_risk_alert(risk_request: RiskCheckRequest, risk_result: Dict[str, Any], db):
    """Create risk alert for high/critical risk"""
    alert = RiskAlert(
        user_id=risk_request.user_id,
        alert_type=risk_result["risk_type"],
        severity=risk_result["risk_level"],
        message=risk_result["message"],
        details=risk_result,
        status="active"
    )
    
    db.add(alert)
    await db.commit()

async def _update_or_create_limit(limit_type: str, metric: str, config: Dict[str, Any], db):
    """Update or create risk limit"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(RiskLimit).where(
            RiskLimit.limit_type == limit_type,
            RiskLimit.metric == metric
        )
    )
    limit = result.scalar_one_or_none()
    
    if limit:
        # Update existing limit
        limit.limit_value = config.get("limit_value", limit.limit_value)
        limit.threshold_warning = config.get("threshold_warning", limit.threshold_warning)
        limit.threshold_critical = config.get("threshold_critical", limit.threshold_critical)
    else:
        # Create new limit
        limit = RiskLimit(
            limit_type=limit_type,
            metric=metric,
            limit_value=config["limit_value"],
            threshold_warning=config.get("threshold_warning", 0.8),
            threshold_critical=config.get("threshold_critical", 0.95)
        )
        db.add(limit)
    
    await db.commit()

async def _calculate_risk_summary(limits: List[RiskLimit], current_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate overall risk summary"""
    total_limits = len(limits)
    breached_limits = sum(1 for limit in limits if limit.current_value > limit.limit_value)
    warning_limits = sum(1 for limit in limits if limit.current_value > limit.limit_value * limit.threshold_warning)
    
    risk_score = 0
    if total_limits > 0:
        risk_score = (breached_limits * 2 + warning_limits) / (total_limits * 2)
    
    return {
        "total_limits": total_limits,
        "breached_limits": breached_limits,
        "warning_limits": warning_limits,
        "risk_score": min(risk_score, 1.0),
        "overall_status": "critical" if breached_limits > 0 else "warning" if warning_limits > 0 else "normal"
    }

def _get_limit_status(limit: RiskLimit) -> str:
    """Get status of a risk limit"""
    if limit.current_value >= limit.limit_value:
        return "breached"
    elif limit.current_value >= limit.limit_value * limit.threshold_critical:
        return "critical"
    elif limit.current_value >= limit.limit_value * limit.threshold_warning:
        return "warning"
    else:
        return "normal"

async def run_portfolio_risk_assessment(user_id: int):
    """Background task for portfolio risk assessment"""
    try:
        risk_monitor = app.state.risk_monitor
        await risk_monitor.assess_portfolio_risk(user_id)
        logger.info("Portfolio risk assessment completed", user_id=user_id)
    except Exception as e:
        logger.error("Portfolio risk assessment failed", user_id=user_id, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
