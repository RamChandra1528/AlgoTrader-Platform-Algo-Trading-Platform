import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// --- Dashboard ---
export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),
  equityCurve: () => api.get("/dashboard/equity-curve"),
  positions: () => api.get("/dashboard/positions"),
};

// --- Strategies ---
export const strategiesApi = {
  list: () => api.get("/strategies/"),
  create: (data: { name: string; strategy_type: string; parameters?: Record<string, number> }) =>
    api.post("/strategies/", data),
  get: (id: number) => api.get(`/strategies/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/strategies/${id}`, data),
  delete: (id: number) => api.delete(`/strategies/${id}`),
};

// --- Backtests ---
export const backtestsApi = {
  run: (data: {
    strategy_id: number;
    symbol: string;
    start_date: string;
    end_date: string;
    initial_capital?: number;
  }) => api.post("/backtests/run", data),
  list: () => api.get("/backtests/"),
  get: (id: number) => api.get(`/backtests/${id}`),
};

// --- Trading ---
export const tradingApi = {
  execute: (data: { symbol: string; side: string; quantity: number; strategy_id?: number }) =>
    api.post("/trading/execute", data),
  portfolio: () => api.get("/trading/portfolio"),
  history: () => api.get("/trading/history"),
};

// --- Auto Trading ---
export const autoTradingApi = {
  scan: () => api.post("/autotrading/scan"),
  execute: (data: { budget: number }) => api.post("/autotrading/execute", data),
};

export default api;
