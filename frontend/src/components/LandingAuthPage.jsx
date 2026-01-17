// frontend/src/components/LandingAuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  Store, TrendingUp, Users, BarChart3,
  Lock, Mail, Building2, Phone, Check
} from 'lucide-react';

export default function LandingAuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.refresh_token, data.user, data.tenant);
        navigate('/varieties'); // Changed to /varieties as your first page
      } else {
        const error = await response.json();
        alert(error.detail || 'Login failed');
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (registerData.password !== registerData.confirm_password) {
      alert('Passwords do not match');
      return;
    }

    if (registerData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: registerData.business_name,
          owner_name: registerData.owner_name,
          email: registerData.email,
          phone: registerData.phone,
          password: registerData.password,
          city: registerData.city,
          state: registerData.state,
          address: registerData.address,
          country: 'Pakistan'
        })
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.refresh_token, data.user, data.tenant);
        alert('Welcome! You have a 7-day free trial.');
        navigate('/varieties');
      } else {
        const error = await response.json();
        alert(error.detail || 'Registration failed');
      }
    } catch (error) {
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showAuth) {
    return (
      <div className="min-h-screen bg-white">

        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-gray-900" />
              <span className="text-xl font-semibold text-gray-900">ShopSmart</span>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Sign In
            </button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full mb-6">
              7-day free trial
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Inventory and sales management for cloth shops
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Track sales, manage inventory, and analyze performance with enterprise-grade tools built for retail.
            </p>

            <button
              onClick={() => {
                setShowAuth(true);
                setAuthMode('register');
              }}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Get Started
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-3 gap-12">

              <div>
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Monitor transactions, calculate margins, and manage team performance in real time.
                </p>
              </div>

              <div>
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
                <p className="text-gray-600 leading-relaxed">
                  Understand product performance, identify trends, and make data-driven decisions.
                </p>
              </div>

              <div>
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Access</h3>
                <p className="text-gray-600 leading-relaxed">
                  Add users, assign roles, and collaborate across locations with secure access controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">

      <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-8">

        <div className="flex items-center justify-center gap-2 mb-8">
          <Store className="w-6 h-6 text-gray-900" />
          <span className="text-xl font-semibold text-gray-900">ShopSmart</span>
        </div>

        <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${authMode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${authMode === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Sign Up
          </button>
        </div>

        {authMode === 'login' ? (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Add this after password input */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              onClick={() => setShowAuth(false)}
              className="w-full text-gray-600 hover:text-gray-900 text-sm transition"
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                required
                value={registerData.business_name}
                onChange={(e) => setRegisterData({ ...registerData, business_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="My Cloth Shop"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name
              </label>
              <input
                type="text"
                required
                value={registerData.owner_name}
                onChange={(e) => setRegisterData({ ...registerData, owner_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="03XX-XXXXXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={registerData.city}
                  onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Lahore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={registerData.state}
                  onChange={(e) => setRegisterData({ ...registerData, state: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Punjab"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={registerData.confirm_password}
                onChange={(e) => setRegisterData({ ...registerData, confirm_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Re-enter password"
              />
            </div>



            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </button>

            <button
              onClick={() => setShowAuth(false)}
              className="w-full text-gray-600 hover:text-gray-900 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}