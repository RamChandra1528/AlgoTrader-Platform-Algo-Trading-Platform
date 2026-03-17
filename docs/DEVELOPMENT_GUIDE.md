# Development Guide

## Table of Contents

1. [Setup](#setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance Optimization](#performance-optimization)
8. [Contributing](#contributing)

---

## Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 16+
- **Redis** 7+
- **Docker** and Docker Compose
- **Git**

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd algo-trading-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run migrations
   cd backend
   alembic upgrade head
   ```

5. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

### IDE Configuration

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.black-formatter",
    "ms-python.flake8",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode-remote.remote-containers"
  ]
}
```

#### VS Code Settings
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

---

## Project Structure

```
algo-trading-platform/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── market_data.py
│   │   │   ├── strategies.py
│   │   │   ├── portfolio.py
│   │   │   └── orders.py
│   │   ├── core/              # Core configuration
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── strategy.py
│   │   │   ├── portfolio.py
│   │   │   └── order.py
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── strategy.py
│   │   │   ├── portfolio.py
│   │   │   └── order.py
│   │   ├── services/          # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── market_data_service.py
│   │   │   ├── strategy_service.py
│   │   │   └── portfolio_service.py
│   │   ├── strategies/        # Trading strategies
│   │   │   ├── base.py
│   │   │   ├── moving_average.py
│   │   │   └── rsi.py
│   │   └── utils/             # Utility functions
│   │       ├── calculations.py
│   │       └── helpers.py
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Test files
│   ├── requirements.txt       # Production dependencies
│   ├── requirements-dev.txt   # Development dependencies
│   └── main.py               # Application entry point
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── (dashboard)/   # Dashboard layout
│   │   │   ├── auth/          # Authentication pages
│   │   │   ├── strategies/    # Strategy pages
│   │   │   └── portfolio/     # Portfolio pages
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/            # UI components
│   │   │   ├── charts/        # Chart components
│   │   │   ├── forms/         # Form components
│   │   │   └── layout/        # Layout components
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── usePortfolio.ts
│   │   ├── lib/               # Utility functions
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── store/             # State management
│   │   │   ├── authStore.ts
│   │   │   └── portfolioStore.ts
│   │   └── types/             # TypeScript definitions
│   │       ├── api.ts
│   │       ├── auth.ts
│   │       └── portfolio.ts
│   ├── public/                # Static assets
│   ├── tests/                 # Test files
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── services/                  # Microservices
│   ├── auth-service/
│   ├── market-data-service/
│   ├── strategy-service/
│   ├── backtest-service/
│   ├── execution-service/
│   └── risk-service/
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
└── .env.example              # Environment variables template
```

---

## Development Workflow

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-strategy-type
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new features
   - Update documentation

3. **Run Tests**
   ```bash
   # Backend tests
   cd backend && pytest

   # Frontend tests
   cd frontend && npm test

   # Integration tests
   npm run test:integration
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add RSI strategy implementation"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/new-strategy-type
   # Create pull request on GitHub
   ```

### Branch Naming Convention

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

### Commit Message Convention

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(strategies): Add RSI strategy implementation

- Add RSI calculation logic
- Implement buy/sell signals
- Add parameter validation

Closes #123
```

---

## Coding Standards

### Python Standards

#### Code Style
- Use **Black** for code formatting
- Use **Flake8** for linting
- Follow **PEP 8** guidelines
- Maximum line length: 88 characters

#### Type Hints
```python
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class StrategyCreate(BaseModel):
    name: str
    type: str
    parameters: Dict[str, Any]
    description: Optional[str] = None

async def create_strategy(
    strategy: StrategyCreate,
    user_id: str
) -> Strategy:
    """Create a new trading strategy."""
    pass
```

#### Error Handling
```python
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

async def get_strategy(strategy_id: str) -> Strategy:
    try:
        strategy = await strategy_service.get_by_id(strategy_id)
        if not strategy:
            raise HTTPException(
                status_code=404,
                detail="Strategy not found"
            )
        return strategy
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )
```

#### Database Models
```python
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### TypeScript/JavaScript Standards

#### Code Style
- Use **Prettier** for formatting
- Use **ESLint** for linting
- Use **TypeScript** for type safety
- Maximum line length: 100 characters

#### Component Structure
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Strategy } from '@/types/strategy';

interface StrategyCardProps {
  strategy: Strategy;
  onUpdate?: (strategy: Strategy) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Component logic
  }, [strategy.id]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // Update logic
    } catch (error) {
      console.error('Failed to update strategy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strategy.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Strategy content */}
      </CardContent>
    </Card>
  );
};
```

#### API Client
```typescript
import { apiClient } from '@/lib/api';
import { Strategy, StrategyCreate } from '@/types/strategy';

export const strategyApi = {
  getAll: async (): Promise<Strategy[]> => {
    const response = await apiClient.get('/strategies');
    return response.data;
  },

  create: async (data: StrategyCreate): Promise<Strategy> => {
    const response = await apiClient.post('/strategies', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Strategy>): Promise<Strategy> => {
    const response = await apiClient.put(`/strategies/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/strategies/${id}`);
  }
};
```

---

## Testing

### Backend Testing

#### Unit Tests
```python
# tests/test_strategy_service.py
import pytest
from app.services.strategy_service import StrategyService
from app.models.strategy import Strategy

class TestStrategyService:
    def setup_method(self):
        self.strategy_service = StrategyService()

    @pytest.fixture
    def sample_strategy(self):
        return {
            "name": "Test Strategy",
            "type": "moving_average",
            "parameters": {"period": 20}
        }

    async def test_create_strategy(self, sample_strategy):
        """Test strategy creation."""
        strategy = await self.strategy_service.create(sample_strategy)
        
        assert strategy.name == sample_strategy["name"]
        assert strategy.type == sample_strategy["type"]
        assert strategy.parameters == sample_strategy["parameters"]

    async def test_get_strategy_by_id(self, sample_strategy):
        """Test getting strategy by ID."""
        created = await self.strategy_service.create(sample_strategy)
        retrieved = await self.strategy_service.get_by_id(created.id)
        
        assert retrieved.id == created.id
        assert retrieved.name == created.name

    async def test_create_strategy_invalid_data(self):
        """Test strategy creation with invalid data."""
        with pytest.raises(ValueError):
            await self.strategy_service.create({
                "name": "",  # Invalid: empty name
                "type": "moving_average"
            })
```

#### Integration Tests
```python
# tests/test_api_integration.py
import pytest
from httpx import AsyncClient
from app.main import app

class TestStrategyAPI:
    @pytest.fixture
    async def client(self):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.fixture
    async def auth_headers(self, client):
        # Create user and get token
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        token = response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}

    async def test_create_strategy_api(self, client, auth_headers):
        """Test strategy creation via API."""
        strategy_data = {
            "name": "API Test Strategy",
            "type": "moving_average",
            "parameters": {"period": 20}
        }
        
        response = await client.post(
            "/api/strategies",
            json=strategy_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == strategy_data["name"]
```

#### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_strategy_service.py

# Run with specific marker
pytest -m "unit"
pytest -m "integration"
```

### Frontend Testing

#### Component Tests
```tsx
// tests/components/StrategyCard.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StrategyCard } from '@/components/StrategyCard';
import { mockStrategy } from '@/test/mocks/strategy';

describe('StrategyCard', () => {
  it('renders strategy information correctly', () => {
    render(<StrategyCard strategy={mockStrategy} />);
    
    expect(screen.getByText(mockStrategy.name)).toBeInTheDocument();
    expect(screen.getByText(mockStrategy.type)).toBeInTheDocument();
  });

  it('calls onUpdate when update button is clicked', async () => {
    const onUpdate = jest.fn();
    render(<StrategyCard strategy={mockStrategy} onUpdate={onUpdate} />);
    
    const updateButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(mockStrategy);
    });
  });
});
```

#### Hook Tests
```tsx
// tests/hooks/useStrategy.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useStrategy } from '@/hooks/useStrategy';
import { strategyApi } from '@/lib/api';

jest.mock('@/lib/api');

describe('useStrategy', () => {
  it('loads strategies on mount', async () => {
    const mockStrategies = [mockStrategy];
    (strategyApi.getAll as jest.Mock).mockResolvedValue(mockStrategies);

    const { result } = renderHook(() => useStrategy());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.strategies).toEqual(mockStrategies);
  });
});
```

#### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test StrategyCard.test.tsx
```

### Test Configuration

#### Backend (pytest.ini)
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --disable-warnings
    --cov=app
    --cov-report=term-missing
    --cov-report=html
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
```

#### Frontend (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Debugging

### Backend Debugging

#### VS Code Debug Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/main.py",
      "console": "integratedTerminal",
      "justMyCode": false,
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend"
      }
    },
    {
      "name": "Python: Pytest",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${workspaceFolder}/backend/tests"],
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

#### Logging Configuration
```python
# app/core/logging.py
import logging
import sys
from loguru import logger

class InterceptHandler(logging.Handler):
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def setup_logging():
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG"
    )
```

#### Debugging Tips
```python
# Add debug prints
logger.debug(f"Processing strategy: {strategy_id}")

# Use pdb for debugging
import pdb; pdb.set_trace()

# Use VS Code debugger
# Set breakpoints and use launch configuration
```

### Frontend Debugging

#### VS Code Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "cwd": "${workspaceFolder}/frontend"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

#### React DevTools
```bash
# Install React DevTools browser extension
# Add to development dependencies
npm install --save-dev @types/react-dev-tools
```

#### Debugging Tips
```tsx
// Use React DevTools
// Add console.log statements
console.log('Strategy data:', strategy);

// Use debugger statement
debugger;

// Use React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

---

## Performance Optimization

### Backend Optimization

#### Database Optimization
```python
# Use database indexes
class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    created_at = Column(DateTime(timezone=True), index=True)

# Use query optimization
async def get_user_strategies(user_id: str, limit: int = 50):
    query = select(Strategy).where(
        Strategy.user_id == user_id
    ).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
```

#### Caching
```python
import redis
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(expire_time: int = 3600):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            redis_client.setex(
                cache_key,
                expire_time,
                json.dumps(result, default=str)
            )
            return result
        return wrapper
    return decorator

@cache_result(expire_time=300)
async def get_market_data(symbol: str, period: str):
    # Expensive operation
    pass
```

#### Async Optimization
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def process_strategies_concurrently(strategies: List[str]):
    """Process multiple strategies concurrently."""
    tasks = [
        process_single_strategy(strategy_id)
        for strategy_id in strategies
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

# Use thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=4)

async def calculate_indicators(data: List[float]):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        executor,
        _calculate_indicators_sync,
        data
    )
```

### Frontend Optimization

#### Code Splitting
```tsx
// Dynamic imports for large components
const StrategyChart = dynamic(
  () => import('@/components/StrategyChart'),
  {
    loading: () => <div>Loading chart...</div>,
    ssr: false
  }
);

// Route-based code splitting
const StrategiesPage = dynamic(() => import('./app/strategies/page'));
```

#### Memoization
```tsx
import React, { memo, useMemo, useCallback } from 'react';

const StrategyCard = memo(({ strategy, onUpdate }: StrategyCardProps) => {
  const formattedReturn = useMemo(() => {
    return strategy.return?.toFixed(2) ?? '0.00';
  }, [strategy.return]);

  const handleUpdate = useCallback(() => {
    onUpdate(strategy);
  }, [strategy, onUpdate]);

  return (
    <Card>
      <CardContent>
        <div>Return: {formattedReturn}%</div>
        <button onClick={handleUpdate}>Update</button>
      </CardContent>
    </Card>
  );
});
```

#### Virtual Scrolling
```tsx
import { FixedSizeList as List } from 'react-window';

const StrategyList = ({ strategies }: StrategyListProps) => {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <StrategyCard strategy={strategies[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={strategies.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

#### Performance Monitoring
```tsx
// Performance monitoring hook
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  });
};

// React Query configuration for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## Contributing

### Before Contributing

1. Read this development guide
2. Set up your local development environment
3. Run existing tests to ensure everything works
4. Create an issue for your proposed change

### Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   npm run test:all
   
   # Check code formatting
   npm run lint
   npm run format
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Pull Request Guidelines

- Include a clear description of changes
- Link to any relevant issues
- Include screenshots for UI changes
- Ensure all tests pass
- Request code review from team members

### Code Review Process

1. **Automated Checks**
   - All tests must pass
   - Code must pass linting
   - Coverage must not decrease significantly

2. **Manual Review**
   - Code quality and maintainability
   - Performance implications
   - Security considerations
   - Documentation completeness

3. **Approval**
   - At least one team member approval required
   - Maintainer approval for major changes

### Release Process

1. **Version Bump**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Changelog Update**
   - Update CHANGELOG.md
   - Document breaking changes

3. **Tag Release**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

4. **Deploy**
   - Automated deployment pipeline
   - Monitor deployment health

---

## Getting Help

### Documentation

- [API Reference](API_REFERENCE.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)

### Community

- GitHub Issues: Report bugs and request features
- GitHub Discussions: Ask questions and share ideas
- Slack/Discord: Real-time chat with team

### Support Channels

- Technical support: support@trading-platform.com
- Security issues: security@trading-platform.com
- Business inquiries: business@trading-platform.com

---

## Resources

### Learning Materials

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

- [Postman API Collection](docs/postman-collection.json)
- [Database Schema](docs/database-schema.md)
- [Environment Setup Scripts](scripts/setup.sh)

### Best Practices

- [Python Best Practices](https://docs.python-guide.org/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [API Design Guidelines](https://restfulapi.net/)

---

Happy coding! 🚀
