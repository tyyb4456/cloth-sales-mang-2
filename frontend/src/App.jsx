// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';

// Import all your existing pages
import Dashboard from './pages/Dashboard';
import Varieties from './pages/Varieties';
import SupplierInventory from './pages/SupplierInventory';
import SupplierReturns from './pages/SupplierReturns';
import EnhancedSales from './pages/Sales';
import Reports from './pages/Reports';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import PredictionsDashboard from './components/PredictionsDashboard';
import ProductDemandPredictor from './components/ProductDemandPredictor';
import AIChatbot from './components/AIChatbot';
import ExpenseTracker from './components/Expenses';
import FinancialDashboard from './components/FinancialDashboard';
import VoiceSalesComponent from './components/VoiceSalesComponent';
import InventoryDashboard from './components/InventoryDashboard';
import CustomerLoanDashboard from './components/CustomerLoanDashboard';
import ShopkeeperStockManagement from './components/ShopkeeperStockManagement';
import LandingAuthPage from './components/LandingAuthPage';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/varieties', icon: Grid3x3, label: 'Varieties' },
    { path: '/supplier-inventory', icon: Package, label: 'Inventory' },
    { path: '/supplier-returns', icon: TrendingUp, label: 'Returns' },
    { path: '/EnhancedSales', icon: ShoppingCart, label: 'Sales' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },

  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800">Cloth Shop</h1>
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} className="mr-2" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      const storedTenant = localStorage.getItem('tenant');

      if (token && storedUser && storedTenant) {
        setUser(JSON.parse(storedUser));
        setTenant(JSON.parse(storedTenant));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (accessToken, refreshToken, userData, tenantData) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==================== PROTECTED ROUTE ====================
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// ==================== PROTECTED LAYOUT ====================
const ProtectedLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

// ==================== MAIN APP ====================
function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* PUBLIC ROUTE - Landing/Auth Page */}
            <Route path="/" element={<LandingAuthPage />} />
            
            {/* PROTECTED ROUTES - All Pages */}
            <Route path="/Dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/varieties" element={<ProtectedLayout><Varieties /></ProtectedLayout>} />
            <Route path="/supplier-inventory" element={<ProtectedLayout><SupplierInventory /></ProtectedLayout>} />
            <Route path="/supplier-returns" element={<ProtectedLayout><SupplierReturns /></ProtectedLayout>} />
            <Route path="/EnhancedSales" element={<ProtectedLayout><EnhancedSales /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/analytics" element={<ProtectedLayout><AnalyticsDashboard /></ProtectedLayout>} />
            <Route path="/ProductDemandPredictor" element={<ProtectedLayout><ProductDemandPredictor /></ProtectedLayout>} />
            <Route path="/PredictionsDashboard" element={<ProtectedLayout><PredictionsDashboard /></ProtectedLayout>} />
            <Route path="/AIChatbot" element={<ProtectedLayout><AIChatbot /></ProtectedLayout>} />
            <Route path="/ExpenseTracker" element={<ProtectedLayout><ExpenseTracker /></ProtectedLayout>} />
            <Route path="/FinancialDashboard" element={<ProtectedLayout><FinancialDashboard /></ProtectedLayout>} />
            <Route path="/VoiceSalesComponent" element={<ProtectedLayout><VoiceSalesComponent /></ProtectedLayout>} />
            <Route path="/InventoryDashboard" element={<ProtectedLayout><InventoryDashboard /></ProtectedLayout>} />
            <Route path="/CustomerLoanDashboard" element={<ProtectedLayout><CustomerLoanDashboard /></ProtectedLayout>} />
            <Route path="/shopkeeper-stock" element={<ProtectedLayout><ShopkeeperStockManagement /></ProtectedLayout>} />

            {/* CATCH ALL - Redirect to Landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;