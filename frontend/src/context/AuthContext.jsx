// frontend/src/context/AuthContext.jsx - PERSISTENT AUTH WITH COOKIES
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ VERIFY TOKEN ON MOUNT
  useEffect(() => {
    verifyAndRestoreSession();
  }, []);

  const verifyAndRestoreSession = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      const storedTenant = localStorage.getItem('tenant');

      if (!token || !storedUser || !storedTenant) {
        setLoading(false);
        return;
      }

      // ✅ VERIFY TOKEN WITH BACKEND
      try {
        const response = await api.get('/auth/me');
        
        // Token is valid, restore session
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
        setTenant(JSON.parse(storedTenant));
        
      } catch (error) {
        // Token expired or invalid
        console.log('Session expired, clearing auth');
        clearAuth();
      }
      
    } catch (error) {
      console.error('Error verifying session:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = (accessToken, refreshToken, userData, tenantData) => {
    // ✅ STORE IN LOCALSTORAGE (PERSISTENT)
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    
    // ✅ ALSO STORE EXPIRY TIME (1 hour from now)
    const expiryTime = new Date().getTime() + (60 * 60 * 1000); // 1 hour
    localStorage.setItem('token_expiry', expiryTime.toString());

    setIsAuthenticated(true);
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = async () => {
    try {
      // ✅ CALL BACKEND LOGOUT
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('token_expiry');
    
    setIsAuthenticated(false);
    setUser(null);
    setTenant(null);
  };

  // ✅ AUTO-REFRESH TOKEN BEFORE EXPIRY
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = setInterval(async () => {
      const expiryTime = localStorage.getItem('token_expiry');
      const now = new Date().getTime();
      
      // Refresh 5 minutes before expiry
      if (expiryTime && now > parseInt(expiryTime) - (5 * 60 * 1000)) {
        await refreshToken();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTokenExpiry);
  }, [isAuthenticated]);

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        clearAuth();
        return;
      }

      const response = await api.post('/auth/refresh', {
        refresh_token: refresh
      });

      const { access_token, expires_in } = response.data;
      
      localStorage.setItem('access_token', access_token);
      const expiryTime = new Date().getTime() + (expires_in * 1000);
      localStorage.setItem('token_expiry', expiryTime.toString());
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        tenant, 
        login, 
        logout,
        refreshToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}