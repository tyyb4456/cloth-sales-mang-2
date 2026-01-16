// frontend/src/components/Sidebar.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Boxes,
  Mic,
  DollarSign,   
  Wallet,             
  Menu,
  X,
  ChevronRight,
  LineChart,
  MessageSquareText,
  Users,
  HandCoins,
  LogOut,
  User,
  Building2,
  Package,
  TruckIcon,
  RotateCcw,
  ShoppingCart,
  FileText,
  BarChart3
} from 'lucide-react';

import { useAuth } from '../App';

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, user, tenant } = useAuth(); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  const menuItems = [
    { path: '/Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { 
      section: 'Core Operations',
      items: [
        { path: '/varieties', icon: Package, label: 'Cloth Varieties' },
        { path: '/supplier-inventory', icon: TruckIcon, label: 'Supplier Inventory' },
        { path: '/supplier-returns', icon: RotateCcw, label: 'Supplier Returns' },
        { path: '/sales', icon: ShoppingCart, label: 'Sales' },
    
      ]
    },
    {
      section: 'Analytics & Reports',
      items: [
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics Dashboard' },
        { path: '/ProductDemandPredictor', icon: LineChart, label: 'Demand Predictor' },
        { path: '/PredictionsDashboard', icon: LineChart, label: 'Predictions Dashboard' },
      ]
    },
    {
      section: 'AI & Advanced',
      items: [
        { path: '/AIChatbot', icon: MessageSquareText, label: 'AI Chatbot' },
        { path: '/VoiceSalesComponent', icon: Mic, label: 'Voice Sales' },
      ]
    },
    {
      section: 'Financial',
      items: [
        { path: '/ExpenseTracker', icon: Wallet, label: 'Expense Tracker' },
        { path: '/FinancialDashboard', icon: DollarSign, label: 'Financial Dashboard' },
        { path: '/CustomerLoanDashboard', icon: HandCoins, label: 'Customer Loans' },
      ]
    },
    {
      section: 'Inventory & Stock',
      items: [
        { path: '/InventoryDashboard', icon: Boxes, label: 'Inventory Dashboard' },
        { path: '/shopkeeper-stock', icon: Users, label: 'Shopkeeper Stock' },
      ]
    }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <button
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
          isActive
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-r-4 border-gray-700 dark:border-gray-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        {sidebarOpen && (
          <span className="font-medium text-sm">{item.label}</span>
        )}
        {isActive && sidebarOpen && (
          <ChevronRight size={16} className="ml-auto" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Cloth Shop</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item, index) => {
            if (item.section) {
              return (
                <div key={index} className="mb-4">
                  {sidebarOpen && (
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {item.section}
                    </div>
                  )}
                  {item.items.map(subItem => renderMenuItem(subItem))}
                </div>
              );
            } else {
              return renderMenuItem(item);
            }
          })}
        </nav>

        {/* USER INFO & LOGOUT SECTION */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* User Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <User size={16} className="text-gray-500 dark:text-gray-400" />
                <p className="text-sm font-medium truncate">
                  {user?.full_name || 'User'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Building2 size={14} className="ml-0.5" />
                <p className="text-xs truncate">
                  {tenant?.business_name || 'Business'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>

            {/* Copyright */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
              © 2025 Cloth Shop
            </p>
          </div>
        )}

        {/* Collapsed state - show logout icon only */}
        {!sidebarOpen && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition flex items-center justify-center"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Cloth Shop</h1>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item, index) => {
            if (item.section) {
              return (
                <div key={index} className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {item.section}
                  </div>
                  {item.items.map(subItem => renderMenuItem(subItem))}
                </div>
              );
            } else {
              return renderMenuItem(item);
            }
          })}
        </nav>

        {/* MOBILE USER INFO & LOGOUT */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* User Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <User size={16} className="text-gray-500 dark:text-gray-400" />
              <p className="text-sm font-medium truncate">
                {user?.full_name || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Building2 size={14} className="ml-0.5" />
              <p className="text-xs truncate">
                {tenant?.business_name || 'Business'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
      >
        <Menu size={24} />
      </button>
    </>
  );
}