// frontend/src/pages/Sales.jsx - FIXED WITH AUTHENTICATION

import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Package, DollarSign, TrendingUp , Send } from 'lucide-react';
import SalesForm from '../components/SaleForm';
import api from '../api/api'; // USING AUTHENTICATED API
// import { sendInvoiceWhatsApp } from '../api/api';


const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

export default function EnhancedSalesWithPriceSelector() {
  const [varieties, setVarieties] = useState([]);
  const [sales, setSales] = useState([]);
  const [supplierInventories, setSupplierInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  useEffect(() => {
    loadVarieties();
    loadSupplierInventories();
  }, []);

  useEffect(() => {
    loadSales();
  }, [selectedDate]);

  const loadVarieties = async () => {
    try {
      // Using authenticated API
      const response = await api.get('/varieties/');
      setVarieties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  // const handleSendWhatsApp = async (sale) => {
  //   const phone = prompt('Enter customer WhatsApp number (with country code, e.g., +923001234567):');
    
  //   if (!phone) return;
    
  //   try {
  //     await sendInvoiceWhatsApp(sale.id, phone);
  //     alert('Invoice sent via WhatsApp!');
  //   } catch (error) {
  //     alert('Failed to send: ' + (error.response?.data?.detail || 'Unknown error'));
  //   }
  // };

  const formatQuantityWithUnit = (quantity, unit) => {
    const qty = parseFloat(quantity);
    if (unit === 'meters') return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
    if (unit === 'yards') return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
    return Math.floor(qty);
  };

  const loadSupplierInventories = async () => {
    try {
      // ✅ FIXED: Using authenticated API
      const response = await api.get('/supplier/inventory');
      setSupplierInventories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading supplier inventories:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Using authenticated API
      const response = await api.get(`/sales/date/${selectedDate}`);
      setSales(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sale? This action cannot be undone.')) return;

    try {
      // ✅ FIXED: Using authenticated API
      await api.delete(`/sales/${id}`);
      loadSales();
      loadSupplierInventories();
      alert('Sale deleted successfully!');
    } catch (error) {
      console.error('Failed to delete sale:', error);
      alert('Failed to delete sale');
    }
  };

  const totalSales = sales.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.quantity), 0);
  const totalProfit = sales.reduce((sum, item) => sum + parseFloat(item.profit), 0);
  const totalItemsSold = sales.reduce((sum, item) => {
    return sum + getItemCount(item.quantity, item.variety.measurement_unit);
  }, 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Sales Management
              </h1>
              <p className="mt-2 text-gray-600">Record and track your daily sales with precision</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-linear-to-r from-gray-600 to-gray-800 rounded-xl blur opacity-20 group-hover:opacity-30 transition"></div>
                <div className="relative flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                  <Calendar size={20} className="text-gray-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-gray-800 font-medium focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowForm(!showForm)}
                className="relative group overflow-hidden bg-linear-to-r from-gray-700 to-gray-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-linear-to-r from-gray-600 to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-2">
                  <Plus size={20} />
                  <span>Record Sale</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <SalesForm
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={() => {
            loadSales();
            loadSupplierInventories();
          }}
          varieties={varieties}
          supplierInventories={supplierInventories}
          API_BASE_URL="http://127.0.0.1:8000"
        />

        {!loading && sales.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Package className="text-blue-600" size={28} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Items Sold</p>
                <p className="text-4xl font-bold text-gray-800">{totalItemsSold}</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <DollarSign className="text-purple-600" size={28} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Sales</p>
                <p className="text-4xl font-bold text-gray-800">₹{totalSales.toFixed(2)}</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <TrendingUp className="text-green-600" size={28} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Profit</p>
                <p className="text-4xl font-bold text-green-600">₹{totalProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
            <h3 className="text-xl font-bold text-gray-800">Sales Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-600 font-semibold text-lg">No sales recorded</p>
              <p className="text-sm text-gray-400 mt-1">Start by recording your first sale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Salesperson</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Variety</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Sale</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Profit</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800 capitalize">{item.salesperson_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{item.variety.name}</div>
                        <div className="text-xs text-gray-500 capitalize mt-1">{item.variety.measurement_unit}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.stock_type === 'new_stock'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}>
                          {item.stock_type === 'new_stock' ? '✓ New' : 'Old'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                          {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                        </span>
                        {item.customer_name && (
                          <div className="text-xs text-gray-600 mt-1">{item.customer_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-gray-800">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-gray-800">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ₹{parseFloat(item.selling_price).toFixed(2)}/unit
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-green-600">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {new Date(item.sale_timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete sale"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                      {/* <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSendWhatsApp(item)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Send via WhatsApp"
                          >
                            <Send size={18} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete sale"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}