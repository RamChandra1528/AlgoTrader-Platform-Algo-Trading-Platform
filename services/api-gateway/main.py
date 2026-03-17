from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import httpx
import structlog
from contextlib import asynccontextmanager
from typing import Dict, Any
import redis.asyncio as redis
from jose import JWTError, jwt
from passlib.context import CryptContext

logger = structlog.get_logger()

# Service URLs
SERVICES = {
    "auth": "http://auth-service:8001",
    "market-data": "http://market-data-service:8002", 
    "strategy": "http://strategy-service:8003",
    "backtest": "http://backtest-service:8004",
    "execution": "http://execution-service:8005",
    "risk": "http://risk-service:8006"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
    yield
    # Shutdown
    await app.state.redis_client.close()

app = FastAPI(
    title="Trading Platform API Gateway",
    version="2.0.0",
    description="Professional algorithmic trading platform gateway",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_current_user(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    token = token.split(" ")[1]
    try:
        # Verify token with auth service
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICES['auth']}/verify-token",
                json={"token": token}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            return response.json()
    except Exception as e:
        logger.error("Token verification failed", error=str(e))
        raise HTTPException(status_code=401, detail="Authentication failed")

async def proxy_request(request: Request, service: str, path: str):
    if service not in SERVICES:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service_url = SERVICES[service] + path
    
    # Get request body
    body = await request.body()
    
    # Prepare headers
    headers = dict(request.headers)
    headers.pop("host", None)  # Remove host header
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=request.method,
                url=service_url,
                headers=headers,
                content=body,
                params=request.query_params,
                timeout=30.0
            )
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code,
                headers=dict(response.headers)
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Service timeout")
        except Exception as e:
            logger.error("Proxy request failed", service=service, path=path, error=str(e))
            raise HTTPException(status_code=502, detail="Service unavailable")

# Route handlers
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(request: Request, path: str):
    return await proxy_request(request, "auth", f"/{path}")

@app.api_route("/market-data/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def market_data_proxy(request: Request, path: str, user: Dict[str, Any] = Depends(get_current_user)):
    return await proxy_request(request, "market-data", f"/{path}")

@app.api_route("/strategy/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def strategy_proxy(request: Request, path: str, user: Dict[str, Any] = Depends(get_current_user)):
    return await proxy_request(request, "strategy", f"/{path}")

@app.api_route("/backtest/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def backtest_proxy(request: Request, path: str, user: Dict[str, Any] = Depends(get_current_user)):
    return await proxy_request(request, "backtest", f"/{path}")

@app.api_route("/execution/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def execution_proxy(request: Request, path: str, user: Dict[str, Any] = Depends(get_current_user)):
    return await proxy_request(request, "execution", f"/{path}")

@app.api_route("/risk/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def risk_proxy(request: Request, path: str, user: Dict[str, Any] = Depends(get_current_user)):
    return await proxy_request(request, "risk", f"/{path}")

@app.get("/health")
async def health_check():
    services_status = {}
    
    for service_name, service_url in SERVICES.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{service_url}/health", timeout=5.0)
                services_status[service_name] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            services_status[service_name] = "unreachable"
    
    return {
        "status": "healthy",
        "services": services_status,
        "version": "2.0.0"
    }

@app.websocket("/ws/{service}")
async def websocket_proxy(websocket, service: str):
    if service not in SERVICES:
        await websocket.close(code=404, reason="Service not found")
        return
    
    # WebSocket proxy implementation would go here
    # For now, close connection
    await websocket.close(code=501, reason="WebSocket proxy not implemented")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
