// frontend/src/api/api.js - IMPROVED WITH AUTO TOKEN REFRESH
import axios from 'axios';

const API_BASE_URL = 'https://clothsmart-production-dc97.up.railway.app/';
// const API_BASE_URL = 'http://127.0.0.1:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: false, 
});

// ✅ REQUEST INTERCEPTOR - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ RESPONSE INTERCEPTOR - Handle 401 errors and auto-refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // ✅ If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // No refresh token, force logout
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        // ✅ Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token, expires_in } = response.data;
        
        // ✅ Store new token
        localStorage.setItem('access_token', access_token);
        const expiryTime = new Date().getTime() + (expires_in * 1000);
        localStorage.setItem('token_expiry', expiryTime.toString());
        
        // ✅ Update default header
        api.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
        originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
        
        // ✅ Process queued requests
        processQueue(null, access_token);
        
        isRefreshing = false;
        
        // ✅ Retry original request
        return api(originalRequest);
        
      } catch (refreshError) {
        // ✅ Refresh failed, force logout
        processQueue(refreshError, null);
        isRefreshing = false;
        
        console.error('Token refresh failed - redirecting to login');
        localStorage.clear();
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Cloth Varieties
export const getVarieties = () => api.get('/varieties/');
export const createVariety = (data) => api.post('/varieties/', data);
export const updateVariety = (id, data) => api.put(`/varieties/${id}`, data);
export const deleteVariety = (id) => api.delete(`/varieties/${id}`);

// Supplier Inventory
export const getSupplierInventory = () => api.get('/supplier/inventory');
export const getSupplierInventoryByDate = (date) => api.get(`/supplier/inventory/date/${date}`);
export const createSupplierInventory = (data) => api.post('/supplier/inventory', data);
export const deleteSupplierInventory = (id) => api.delete(`/supplier/inventory/${id}`);

// Supplier Returns
export const getSupplierReturns = () => api.get('/supplier/returns');
export const getSupplierReturnsByDate = (date) => api.get(`/supplier/returns/date/${date}`);
export const createSupplierReturn = (data) => api.post('/supplier/returns', data);
export const deleteSupplierReturn = (id) => api.delete(`/supplier/returns/${id}`);

// Supplier Summary
export const getSupplierDailySummary = (date) => api.get(`/supplier/daily-summary/${date}`);
export const getSupplierWiseSummary = (date) => api.get(`/supplier/supplier-summary/${date}`);

// Sales
export const getSales = () => api.get('/sales/');
export const getSalesByDate = (date) => api.get(`/sales/date/${date}`);
export const createSale = (data) => api.post('/sales/', data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

// Sales Summary
export const getDailySalesSummary = (date) => api.get(`/sales/daily-summary/${date}`);
export const getSalespersonSummary = (name, date) => api.get(`/sales/salesperson-summary/${name}/${date}`);

// Reports
export const getDailyReport = (date) => api.get(`/reports/daily/${date}`);
export const getProfitReport = (date) => api.get(`/reports/profit/${date}`);

// Expenses
export const getExpenses = () => api.get('/expenses/');
export const getExpensesByDate = (date) => api.get(`/expenses/date/${date}`);
export const getExpensesByMonth = (year, month) => api.get(`/expenses/month/${year}/${month}`);
export const createExpense = (data) => api.post('/expenses/', data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
export const getExpenseSummary = (date) => api.get(`/expenses/summary/${date}`);
export const getFinancialReport = (year, month) => api.get(`/expenses/financial-report/${year}/${month}`);

export default api;