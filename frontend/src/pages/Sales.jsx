// frontend/src/pages/Sales.jsx - WITH FULL EDIT FLEXIBILITY
import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Package, DollarSign, TrendingUp, AlertCircle, Edit2, Save, X } from 'lucide-react';
import SalesForm from '../components/SaleForm';
import api from '../api/api';

import { EditSaleModal } from '../components/core/SaleFunc'
import {SkeletonStatCard, SkeletonMobileCard, SkeletonTableRow} from '../components/skeleton/UnifiedSkeleton'

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
  const [filterMode, setFilterMode] = useState('all');
  const [editingSale, setEditingSale] = useState(null);

  useEffect(() => {
    loadVarieties();
    loadSupplierInventories();
  }, []);

  useEffect(() => {
    loadSales();
  }, [selectedDate]);

  const loadVarieties = async () => {
    try {
      const response = await api.get('/varieties/');
      setVarieties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const formatQuantityWithUnit = (quantity, unit) => {
    const qty = parseFloat(quantity);
    if (unit === 'meters') return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
    if (unit === 'yards') return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
    return Math.floor(qty);
  };

  const loadSupplierInventories = async () => {
    try {
      const response = await api.get('/supplier/inventory');
      setSupplierInventories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading supplier inventories:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
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
      await api.delete(`/sales/${id}`);
      loadSales();
      loadSupplierInventories();
      alert('Sale deleted successfully!');
    } catch (error) {
      console.error('Failed to delete sale:', error);
      alert('Failed to delete sale');
    }
  };

  const filteredSales = sales.filter(sale => {
    if (filterMode === 'cost_unknown') {
      return parseFloat(sale.cost_price) === 0;
    }
    return true;
  });

  const costUnknownCount = sales.filter(s => parseFloat(s.cost_price) === 0).length;

  const totalSales = filteredSales.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.quantity), 0);
  const totalProfit = filteredSales.reduce((sum, item) => sum + parseFloat(item.profit), 0);
  const totalItemsSold = filteredSales.reduce((sum, item) => {
    return sum + getItemCount(item.quantity, item.variety.measurement_unit);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* HEADER */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100">
                Sales Management
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Record and track your daily sales with precision
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm">
                <Calendar size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm sm:text-base text-gray-800 dark:text-gray-100 font-medium focus:outline-none min-w-0 flex-1"
                />
              </div>

              <button
                onClick={() => setShowForm(!showForm)}
                className="w-full sm:w-auto flex items-center justify-center bg-gray-700 dark:bg-gray-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all text-sm sm:text-base"
              >
                <Plus size={18} className="mr-2" />
                <span>Record Sale</span>
              </button>
            </div>
          </div>
        </div>

        {/* FILTER TABS */}
        {!loading && sales.length > 0 && (
          <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterMode === 'all'
                  ? 'bg-gray-700 dark:bg-gray-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All Sales ({sales.length})
            </button>
            
            {costUnknownCount > 0 && (
              <button
                onClick={() => setFilterMode('cost_unknown')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  filterMode === 'cost_unknown'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                }`}
              >
                <AlertCircle size={16} />
                Needs Cost Update ({costUnknownCount})
              </button>
            )}
          </div>
        )}

        {/* Sales Form Modal */}
        <SalesForm
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={() => {
            loadSales();
            loadSupplierInventories();
          }}
          varieties={varieties}
          supplierInventories={supplierInventories}
        />

        {/* Edit Sale Modal */}
        {editingSale && (
          <EditSaleModal
            sale={editingSale}
            varieties={varieties}
            onClose={() => setEditingSale(null)}
            onSave={() => {
              loadSales();
              setEditingSale(null);
            }}
          />
        )}

        {/* SUMMARY CARDS */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        ) : !loading && filteredSales.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2.5 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                  <Package className="text-blue-600 dark:text-blue-400 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Items Sold</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100">{totalItemsSold}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2.5 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl">
                  <DollarSign className="text-purple-600 dark:text-purple-400 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Sales</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100">₹{totalSales.toFixed(2)}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2.5 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg sm:rounded-xl">
                  <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Profit</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400">₹{totalProfit.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* SALES LIST */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm sm:shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100">
              {filterMode === 'cost_unknown' ? 'Sales Needing Cost Update' : 'Sales Records'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {loading ? (
            <>
              <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <SkeletonMobileCard key={i} />
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Salesperson</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Variety</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sale</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {[...Array(5)].map((_, i) => (
                      <SkeletonTableRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Package className="text-gray-400 dark:text-gray-500 w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-semibold">
                {filterMode === 'cost_unknown' ? 'No sales need cost updates' : 'No sales recorded'}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                {filterMode === 'cost_unknown' ? 'All sales have cost information' : 'Start by recording your first sale'}
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE: Card View */}
              <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSales.map((item) => {
                  const hasCost = parseFloat(item.cost_price) > 0;
                  
                  return (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1 truncate">
                            {item.variety.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {item.salesperson_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => setEditingSale(item)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Edit sale"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {!hasCost && (
                        <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
                          <AlertCircle size={14} className="text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">Cost needs update</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Quantity</span>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Sale Amount</span>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Profit</span>
                          <span className={`font-semibold ${hasCost ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            ₹{parseFloat(item.profit).toFixed(2)}
                            {!hasCost && ' (approx)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Time</span>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {new Date(item.sale_timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.payment_status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        }`}>
                          {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                        </span>
                        
                        {item.customer_name && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {item.customer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP: Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Salesperson</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Variety</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sale</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredSales.map((item, idx) => {
                      const hasCost = parseFloat(item.cost_price) > 0;
                      
                      return (
                        <tr
                          key={item.id}
                          className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${!hasCost ? 'border-l-4 border-orange-500' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{item.salesperson_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-800 dark:text-gray-100">{item.variety.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{item.variety.measurement_unit}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.payment_status === 'paid'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              }`}>
                              {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                            </span>
                            {item.customer_name && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.customer_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-gray-800 dark:text-gray-100">
                              {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-bold text-gray-800 dark:text-gray-100">
                              ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              ₹{parseFloat(item.selling_price).toFixed(2)}/unit
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`font-bold ${hasCost ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              ₹{parseFloat(item.profit).toFixed(2)}
                              {!hasCost && <span className="text-xs"> (approx)</span>}
                            </div>
                            {!hasCost && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center justify-end gap-1">
                                <AlertCircle size={12} />
                                <span>Cost unknown</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(item.sale_timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setEditingSale(item)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Edit sale"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete sale"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}