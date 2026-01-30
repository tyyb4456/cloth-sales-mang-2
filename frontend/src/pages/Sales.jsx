// frontend/src/pages/Sales.jsx - MODERN GLASSMORPHISM DESIGN WITH PROGRESSIVE DISCLOSURE
import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Package, DollarSign, TrendingUp, AlertCircle, Edit2, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SalesForm from '../components/SaleForm';
import api from '../api/api';

import { EditSaleModal } from '../components/core/SaleFunc';
import { SkeletonStatCard, SkeletonMobileCard, SkeletonTableRow } from '../components/skeleton/UnifiedSkeleton';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

// Glassmorphic Card Component
const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`relative backdrop-blur-xl bg-white/10 dark:bg-gray-900/30 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl" />
    <div className="relative">{children}</div>
  </motion.div>
);

// Stat Card Component with Hover Effects
const StatCard = ({ icon: Icon, title, value, subtitle, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.02, y: -5 }}
    className="group"
  >
    <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-900/40 dark:to-gray-900/20 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl overflow-hidden">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`} />
      </div>

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">
          {title}
        </p>
        
        <motion.p 
          className="text-3xl font-bold text-gray-900 dark:text-white mb-1"
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
        >
          {value}
        </motion.p>
        
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </motion.div>
);

export default function ModernSalesWithProgressiveDisclosure() {
  const [varieties, setVarieties] = useState([]);
  const [sales, setSales] = useState([]);
  const [supplierInventories, setSupplierInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [filterMode, setFilterMode] = useState('all');
  const [editingSale, setEditingSale] = useState(null);
  const [showRecords, setShowRecords] = useState(false); // Progressive disclosure state

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Sales Dashboard
              </h1>
              <p className="text-gray-400 dark:text-gray-500">
                Track your daily performance with precision
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Modern Date Selector */}
              <GlassCard className="px-4 py-3" delay={0.1}>
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-blue-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </GlassCard>

              {/* Record Sale Button with Ripple Effect */}
              <motion.button
                onClick={() => setShowForm(!showForm)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  <Plus size={20} />
                  <span>Record Sale</span>
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* FILTER TABS */}
        {!loading && sales.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 flex flex-wrap gap-3"
          >
            <motion.button
              onClick={() => setFilterMode('all')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'backdrop-blur-xl bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              All Sales ({sales.length})
            </motion.button>
            
            {costUnknownCount > 0 && (
              <motion.button
                onClick={() => setFilterMode('cost_unknown')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  filterMode === 'cost_unknown'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'backdrop-blur-xl bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
                }`}
              >
                <AlertCircle size={16} />
                Needs Cost Update ({costUnknownCount})
              </motion.button>
            )}
          </motion.div>
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

        {/* SUMMARY CARDS - Always Visible Above the Fold */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        ) : !loading && filteredSales.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={Package}
              title="Items Sold"
              value={totalItemsSold}
              subtitle="Total units"
              color="from-blue-500 to-cyan-500"
              delay={0}
            />
            <StatCard
              icon={DollarSign}
              title="Total Sales"
              value={`₹${totalSales.toFixed(2)}`}
              subtitle="Revenue today"
              color="from-purple-500 to-pink-500"
              delay={0.1}
            />
            <StatCard
              icon={TrendingUp}
              title="Total Profit"
              value={`₹${totalProfit.toFixed(2)}`}
              subtitle="Net earnings"
              color="from-green-500 to-emerald-500"
              delay={0.2}
            />
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE BUTTON */}
        {!loading && filteredSales.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center mb-8"
          >
            <motion.button
              onClick={() => setShowRecords(!showRecords)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 text-white font-semibold shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3">
                <Eye size={20} />
                <span>{showRecords ? 'Hide' : 'View'} Sales Records</span>
                <motion.div
                  animate={{ rotate: showRecords ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* SALES RECORDS - Progressive Disclosure */}
        <AnimatePresence>
          {showRecords && !loading && filteredSales.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="overflow-hidden" delay={0}>
                <div className="px-6 py-5 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white">
                    {filterMode === 'cost_unknown' ? 'Sales Needing Cost Update' : 'Sales Records'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* MOBILE: Card View */}
                <div className="block lg:hidden divide-y divide-white/10">
                  {filteredSales.map((item, index) => {
                    const hasCost = parseFloat(item.cost_price) > 0;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        className="p-4 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-base mb-1 truncate">
                              {item.variety.name}
                            </h4>
                            <p className="text-xs text-gray-400 capitalize">
                              {item.salesperson_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <motion.button
                              onClick={() => setEditingSale(item)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition"
                            >
                              <Edit2 size={16} />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(item.id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                        </div>

                        {!hasCost && (
                          <div className="mb-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center gap-2">
                            <AlertCircle size={14} className="text-orange-400 shrink-0" />
                            <span className="text-xs text-orange-300 font-medium">Cost needs update</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-400 text-xs block mb-0.5">Quantity</span>
                            <span className="text-white font-medium">
                              {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs block mb-0.5">Sale Amount</span>
                            <span className="text-white font-medium">
                              ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs block mb-0.5">Profit</span>
                            <span className={`font-semibold ${hasCost ? 'text-green-400' : 'text-orange-400'}`}>
                              ₹{parseFloat(item.profit).toFixed(2)}
                              {!hasCost && ' (approx)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs block mb-0.5">Time</span>
                            <span className="text-white font-medium">
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
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                          </span>
                          
                          {item.customer_name && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {item.customer_name}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* DESKTOP: Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Salesperson</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Variety</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Sale</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Profit</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredSales.map((item, idx) => {
                        const hasCost = parseFloat(item.cost_price) > 0;
                        
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.03 }}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', scale: 1.01 }}
                            className={`transition-all ${!hasCost ? 'border-l-4 border-orange-500' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white capitalize">{item.salesperson_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{item.variety.name}</div>
                              <div className="text-xs text-gray-400 capitalize mt-1">{item.variety.measurement_unit}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                item.payment_status === 'paid'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              }`}>
                                {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                              </span>
                              {item.customer_name && (
                                <div className="text-xs text-gray-400 mt-1">{item.customer_name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-white">
                                {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-bold text-white">
                                ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                ₹{parseFloat(item.selling_price).toFixed(2)}/unit
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className={`font-bold ${hasCost ? 'text-green-400' : 'text-orange-400'}`}>
                                ₹{parseFloat(item.profit).toFixed(2)}
                                {!hasCost && <span className="text-xs"> (approx)</span>}
                              </div>
                              {!hasCost && (
                                <div className="text-xs text-orange-400 mt-1 flex items-center justify-end gap-1">
                                  <AlertCircle size={12} />
                                  <span>Cost unknown</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-400">
                                {new Date(item.sale_timestamp).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <motion.button
                                  onClick={() => setEditingSale(item)}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                >
                                  <Edit2 size={18} />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDelete(item.id)}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EMPTY STATE */}
        {!loading && filteredSales.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-gray-400" size={40} />
              </div>
              <p className="text-white font-semibold text-lg mb-2">
                {filterMode === 'cost_unknown' ? 'No sales need cost updates' : 'No sales recorded'}
              </p>
              <p className="text-gray-400 text-sm">
                {filterMode === 'cost_unknown' ? 'All sales have cost information' : 'Start by recording your first sale'}
              </p>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}