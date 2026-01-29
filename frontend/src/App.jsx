// frontend/src/App.jsx - UPDATED WITH PERSISTENT AUTH
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

// ✅ Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// ✅ Main Layout Component
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

// ✅ App Routes Component (separate from App to use useAuth)
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* ✅ Public Routes */}
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/Dashboard" replace /> : <LandingAuthPage />} 
      />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />

      {/* ✅ Protected Routes */}
      <Route path="/Dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

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

      {/* ✅ Catch all - redirect based on auth */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/Dashboard" : "/"} replace />} 
      />
    </Routes>
  );
}

// ✅ Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;