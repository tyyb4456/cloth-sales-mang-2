// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Varieties from './pages/Varieties';
import SupplierInventory from './pages/SupplierInventory';
import SupplierReturns from './pages/SupplierReturns';
import Sales from './pages/Sales';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import PredictionsDashboard from './components/PredictionsDashboard';
import ProductDemandPredictor from './components/ProductDemandPredictor';
import AIChatbot from './components/AIChatbot';
import ExpenseTracker from './components/Expenses';
import FinancialDashboard from './components/FinancialDashboard';
import VoiceSalesComponent from './components/VoiceSalesComponent';
import CustomerLoanDashboard from './components/CustomerLoanDashboard';
import ShopkeeperStockManagement from './components/ShopkeeperStockManagement';
import LandingAuthPage from './components/LandingAuthPage';

import EmailVerification from './components/auth/EmailVerification';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

import AIAgentPage from './pages/AIAgent';
import TeamManagement from './pages/TeamManagement';




// Auth Context
const AuthContext = createContext();


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');

    if (token && storedUser && storedTenant) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
      setTenant(JSON.parse(storedTenant));
    }
    setLoading(false);
  }, []);

  const login = (accessToken, refreshToken, userData, tenantData) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));

    setIsAuthenticated(true);
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUser(null);
    setTenant(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, tenant, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// Main Layout Component
function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route - Landing/Auth Page */}
          <Route path="/" element={<LandingAuthPage />} />

          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />

          {/* Protected Routes - All wrapped in Layout */}
          <Route path="/varieties" element={
            <ProtectedRoute>
              <Layout><Varieties /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/team" element={
            <ProtectedRoute>
              <Layout><TeamManagement /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/Dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/supplier-inventory" element={
            <ProtectedRoute>
              <Layout><SupplierInventory /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/supplier-returns" element={
            <ProtectedRoute>
              <Layout><SupplierReturns /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/sales" element={
            <ProtectedRoute>
              <Layout><Sales /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <Layout><AnalyticsDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/ProductDemandPredictor" element={
            <ProtectedRoute>
              <Layout><ProductDemandPredictor /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/PredictionsDashboard" element={
            <ProtectedRoute>
              <Layout><PredictionsDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/AIChatbot" element={
            <ProtectedRoute>
              <Layout><AIChatbot /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/ai-agent" element={
            <ProtectedRoute>
              <Layout><AIAgentPage /></Layout>
            </ProtectedRoute>
          } />


          <Route path="/ExpenseTracker" element={
            <ProtectedRoute>
              <Layout><ExpenseTracker /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/FinancialDashboard" element={
            <ProtectedRoute>
              <Layout><FinancialDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/VoiceSalesComponent" element={
            <ProtectedRoute>
              <Layout><VoiceSalesComponent /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/CustomerLoanDashboard" element={
            <ProtectedRoute>
              <Layout><CustomerLoanDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/shopkeeper-stock" element={
            <ProtectedRoute>
              <Layout><ShopkeeperStockManagement /></Layout>
            </ProtectedRoute>
          } />

          {/* Catch all - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;