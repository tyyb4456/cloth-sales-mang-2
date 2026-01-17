import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setSent(true);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              If an account exists with <strong>{email}</strong>, you'll receive a password reset link.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="bg-linear-to-r from-gray-700 to-gray-800 px-8 py-6 text-center">
          <Mail className="w-16 h-16 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <p className="text-gray-600 mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 mb-4"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-gray-600 hover:text-gray-900 text-sm"
          >
            ← Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}