import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function EmailVerification() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token);
  }, []);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => navigate('/'), 3000);
      } else {
        const error = await response.json();
        setStatus('error');
        setMessage(error.detail || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          
          <div className="bg-linear-to-r from-gray-700 to-gray-800 px-8 py-6 text-center">
            <Mail className="w-16 h-16 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Email Verification</h1>
          </div>

          <div className="p-8">
            {status === 'verifying' && (
              <div className="text-center">
                <Loader2 className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 text-lg">Verifying your email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Verified!</h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}