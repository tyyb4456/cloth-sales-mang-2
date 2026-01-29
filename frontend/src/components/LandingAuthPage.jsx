// frontend/src/components/LandingAuthPage.jsx - IMPROVED WITH PERSISTENT LOGIN
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import {
  Store, TrendingUp, Users, BarChart3,
  Lock, Mail, Building2, Phone, Check
} from 'lucide-react';

export default function LandingAuthPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    city: '',
    state: '',
    address: ''
  });

  // ✅ Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/Dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: loginData.email,
        password: loginData.password
      });

      const data = response.data;
      
      console.log('✅ Login successful:', data);
      
      // ✅ Use auth context login (stores in localStorage)
      login(data.access_token, data.refresh_token, data.user, data.tenant);
      
      // ✅ Navigate to dashboard
      navigate('/Dashboard');
      
    } catch (err) {
      console.error('❌ Login error:', err);
      
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // ✅ Validation
    if (registerData.password !== registerData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', {
        business_name: registerData.business_name,
        owner_name: registerData.owner_name,
        email: registerData.email,
        phone: registerData.phone || null,
        password: registerData.password,
        city: registerData.city || null,
        state: registerData.state || null,
        address: registerData.address || null,
        country: 'Pakistan',
        business_type: 'cloth_shop'
      });

      const data = response.data;
      
      console.log('✅ Registration successful:', data);
      
      // ✅ Use auth context login
      login(data.access_token, data.refresh_token, data.user, data.tenant);
      
      // ✅ Show welcome message
      alert('Welcome! You have a 7-day free trial. Please check your email to verify your account.');
      
      // ✅ Navigate to dashboard
      navigate('/Dashboard');
      
    } catch (err) {
      console.error('❌ Registration error:', err);
      
      const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  if (!showAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors">
        {/* NAVBAR */}
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-gray-900 dark:text-gray-100" />
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">ShopSmart</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAuth(true)}
                className="px-5 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                Sign In
              </button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-3xl">
              <div className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full mb-6">
                7-day free trial
              </div>

              <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                Inventory and sales management for cloth shops
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                Track sales, manage inventory, and analyze performance with enterprise-grade tools built for retail.
              </p>

              <button
                onClick={() => {
                  setShowAuth(true);
                  setAuthMode('register');
                }}
                className="px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* FEATURES SECTION */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="max-w-6xl mx-auto px-6 py-20">
              <div className="grid md:grid-cols-3 gap-12">
                <div>
                  <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-5 h-5 text-white dark:text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Sales Tracking</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Monitor transactions, calculate margins, and manage team performance in real time.
                  </p>
                </div>

                <div>
                  <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-white dark:text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Analytics</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Understand product performance, identify trends, and make data-driven decisions.
                  </p>
                </div>

                <div>
                  <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-white dark:text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Team Access</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Add users, assign roles, and collaborate across locations with secure access controls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © 2025 ShopSmart. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition">
                  Privacy Policy
                </a>
                <a href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition">
                  Terms & Conditions
                </a>
                <a href="mailto:igntayyab@gmail.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition">
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ✅ AUTH MODAL
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 transition-colors">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md w-full p-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-gray-900 dark:text-gray-100" />
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">ShopSmart</span>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => {
              setAuthMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              authMode === 'login'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              authMode === 'register'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="text-right">
              <a href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
            >
              ← Back
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Name
              </label>
              <input
                type="text"
                required
                value={registerData.business_name}
                onChange={(e) => setRegisterData({ ...registerData, business_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="My Cloth Shop"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Owner Name
              </label>
              <input
                type="text"
                required
                value={registerData.owner_name}
                onChange={(e) => setRegisterData({ ...registerData, owner_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="03XX-XXXXXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={registerData.city}
                  onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  placeholder="Lahore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                <input
                  type="text"
                  value={registerData.state}
                  onChange={(e) => setRegisterData({ ...registerData, state: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  placeholder="Punjab"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={registerData.confirm_password}
                onChange={(e) => setRegisterData({ ...registerData, confirm_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                placeholder="Re-enter password"
              />
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms & Conditions
              </a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </button>

            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}