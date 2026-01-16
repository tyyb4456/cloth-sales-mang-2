import { useState, useEffect, createContext, useContext } from 'react';
import { Alert } from '@heroui/react';
import { X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'default', title = '') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <div key={toast.id} className="relative animate-slide-in">
            <Alert
              color={toast.type === 'error' ? 'danger' : toast.type === 'success' ? 'success' : 'default'}
              title={toast.title || (toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : 'Info')}
              description={toast.message}
              className="shadow-lg"
            />
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};