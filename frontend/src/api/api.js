// frontend/src/api/api.js
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // 🔧 Skip ngrok browser warning
    'User-Agent': 'ClothShopApp/1.0', // 🔧 Custom user agent
  },
  withCredentials: false, // 🔧 Disable credentials for ngrok
});
// REQUEST INTERCEPTOR - Add token to all requests
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

// RESPONSE INTERCEPTOR - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      console.error('Authentication failed - redirecting to login');
      localStorage.clear();
      window.location.href = '/';
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

// // WhatsApp endpoints
// export const sendInvoiceWhatsApp = (saleId, customerPhone) => 
//   api.post(`/whatsapp/send-invoice/${saleId}?customer_phone=${customerPhone}`);

// export const sendPaymentReminder = (loanId) => 
//   api.post(`/whatsapp/payment-reminder/${loanId}`);

// export const sendDailySummary = () => 
//   api.post('/whatsapp/daily-summary');

// export const testWhatsApp = (phone) => 
//   api.get(`/whatsapp/test?phone=${phone}`);

export default api;