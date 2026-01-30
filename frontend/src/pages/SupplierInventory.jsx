// frontend/src/pages/SupplierInventory.jsx - MODERN GLASSMORPHISM DESIGN WITH PROGRESSIVE DISCLOSURE
import { useState, useEffect } from 'react';
import {
  Plus, Calendar, Trash2, TrendingUp, Package,
  ChevronLeft, ChevronRight, Eye, X, BarChart3,
  Boxes, RotateCcw, CheckCircle, AlertCircle, Search, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';

import { SkeletonStatCard, SkeletonDailyCard, SkeletonGroupCard } from '../components/skeleton/UnifiedSkeleton';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Glassmorphic Card Component
const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`relative backdrop-blur-xl bg-white/10 dark:bg-gray-900/30 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl ${className}`}
  >
    <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-purple-500/5 rounded-2xl" />
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
    <div className="relative backdrop-blur-xl bg-linear-to-br from-white/10 to-white/5 dark:from-gray-900/40 dark:to-gray-900/20 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl overflow-hidden">
      <div className={`absolute inset-0 bg-linear-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute top-0 left-0 w-full h-1 bg-linear-to-r ${color}`} />
      </div>

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-linear-to-br ${color} shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
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

// Daily Card Component
const DailyCard = ({ date, dayData, onClick }) => {
  const dayTotal = dayData.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className="group relative backdrop-blur-xl bg-white/10 dark:bg-gray-900/30 rounded-xl border border-white/20 dark:border-gray-700/50 p-3 text-left overflow-hidden shadow-lg hover:shadow-2xl transition-all"
    >
      <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="text-sm font-semibold text-white">
          {dayTotal.toFixed(0)} units
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {dayData.length} {dayData.length === 1 ? 'supply' : 'supplies'}
        </div>
        <div className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
          <Eye size={12} />
          View
        </div>
      </div>
    </motion.button>
  );
};

export default function ModernSupplierInventory() {
  const [varieties, setVarieties] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allInventory, setAllInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMonthlyInventory, setShowMonthlyInventory] = useState(false); // Progressive disclosure

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    supplier_name: '',
    variety_id: '',
    quantity: '',
    price_per_item: '',
    supply_date: formatDate(new Date())
  });

  const [varietySearch, setVarietySearch] = useState('');
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadVarieties();
    loadAllInventory();
  }, []);

  useEffect(() => {
    loadMonthlyInventory();
  }, [currentMonth, currentYear]);

  const loadVarieties = async () => {
    try {
      const response = await api.get('/varieties/');
      setVarieties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadAllInventory = async () => {
    try {
      const response = await api.get('/supplier/inventory');
      setAllInventory(Array.isArray(response.data) ? response.data : []);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error loading all inventory:', error);
      setInitialLoading(false);
    }
  };

  const loadMonthlyInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/supplier/inventory');
      const data = response.data;

      const filtered = (Array.isArray(data) ? data : []).filter(item => {
        const itemDate = new Date(item.supply_date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      }).sort((a, b) => new Date(b.supply_date) - new Date(a.supply_date));

      setInventory(filtered);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVarietySelect = (variety) => {
    setFormData({ ...formData, variety_id: variety.id });
    setVarietySearch(variety.name);
    setSelectedVariety(variety);
    setShowVarietyDropdown(false);
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price_per_item) || 0;
    return qty * price;
  };

  const total = calculateTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_name || !formData.variety_id || !formData.quantity || !formData.price_per_item) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/supplier/inventory', {
        ...formData,
        variety_id: parseInt(formData.variety_id),
        quantity: parseFloat(formData.quantity),
        price_per_item: parseFloat(formData.price_per_item)
      });

      alert('Inventory added successfully! Stock updated.');
      setFormData({
        supplier_name: '',
        variety_id: '',
        quantity: '',
        price_per_item: '',
        supply_date: formatDate(new Date())
      });
      setVarietySearch('');
      setSelectedVariety(null);
      setShowForm(false);
      loadMonthlyInventory();
      loadAllInventory();
    } catch (err) {
      console.error('Failed to add inventory:', err);
      alert(err.response?.data?.detail || 'Failed to add inventory');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory record? This will reduce stock levels.')) return;

    try {
      await api.delete(`/supplier/inventory/${id}`);
      loadMonthlyInventory();
      loadAllInventory();
      alert('Inventory deleted! Stock restored.');
    } catch (error) {
      console.error('Failed to delete inventory:', error);
      alert(error.response?.data?.detail || 'Failed to delete inventory');
    }
  };

  const changeMonth = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  };

  const showDailyDetailsModal = (date) => {
    setSelectedDate(date);
    setShowDailyDetails(true);
  };

  const overallStats = {
    totalQuantity: allInventory.reduce((sum, item) => sum + parseFloat(item.quantity), 0),
    totalUsed: allInventory.reduce((sum, item) => sum + parseFloat(item.quantity_used), 0),
    totalReturned: allInventory.reduce((sum, item) => sum + parseFloat(item.quantity_returned || 0), 0),
    totalRemaining: allInventory.reduce((sum, item) => sum + parseFloat(item.quantity_remaining), 0),
    totalValue: allInventory.reduce((sum, item) => sum + parseFloat(item.total_amount), 0)
  };

  const groupedBySupplier = inventory.reduce((acc, item) => {
    if (!acc[item.supplier_name]) {
      acc[item.supplier_name] = [];
    }
    acc[item.supplier_name].push(item);
    return acc;
  }, {});

  const totalAmount = inventory.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const isCurrentMonth = currentMonth === new Date().getMonth() &&
    currentYear === new Date().getFullYear();

  const uniqueDates = [...new Set(inventory.map(item => item.supply_date))].sort().reverse();

  const dailyInventory = selectedDate
    ? inventory.filter(item => item.supply_date === selectedDate)
    : [];

  const dailyTotal = dailyInventory.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
  const dailyQuantity = dailyInventory.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-blue-900/20 to-purple-900/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Supplier Inventory
              </h1>
              <p className="text-gray-400 dark:text-gray-500">
                Complete stock overview and daily tracking
              </p>
            </div>
            
            <motion.button
              onClick={() => setShowForm(!showForm)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group px-6 py-3 rounded-xl bg-linear-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                <Plus size={20} />
                <span>Add Supply</span>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* SUPPLY FORM */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="p-6 mb-8" delay={0}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Record New Supply</h3>
                  <motion.button
                    onClick={() => setShowForm(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400"
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-300">
                        Supplier Name *
                      </label>
                      <input
                        type="text"
                        value={formData.supplier_name}
                        onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                        placeholder="Enter supplier name"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 transition"
                        required
                      />
                    </div>

                    <div className="relative">
                      <label className="block mb-2 text-sm font-medium text-gray-300">
                        Cloth Variety *
                      </label>
                      <input
                        type="text"
                        value={varietySearch}
                        onChange={(e) => {
                          setVarietySearch(e.target.value);
                          setShowVarietyDropdown(true);
                        }}
                        onFocus={() => setShowVarietyDropdown(true)}
                        placeholder="Search variety..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 transition"
                        required
                      />

                      {showVarietyDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl"
                        >
                          {filteredVarieties.length === 0 ? (
                            <div className="px-4 py-2 text-gray-400 text-sm">
                              No varieties found
                            </div>
                          ) : (
                            filteredVarieties.map((v) => (
                              <motion.div
                                key={v.id}
                                onClick={() => handleVarietySelect(v)}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                                className="px-4 py-2 cursor-pointer border-b border-white/10 last:border-0 transition"
                              >
                                <div className="font-medium text-white text-sm">{v.name}</div>
                                <div className="text-xs text-gray-400 capitalize">{v.measurement_unit}</div>
                              </motion.div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-300">
                        Quantity {selectedVariety && `(${selectedVariety.measurement_unit})`} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={selectedVariety?.measurement_unit !== 'pieces' ? '0.01' : '1'}
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder={selectedVariety ? `Enter ${selectedVariety.measurement_unit}` : 'Select variety first'}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-300">
                        Price per {selectedVariety ? selectedVariety.measurement_unit.slice(0, -1) : 'Unit'} (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_per_item}
                        onChange={(e) => setFormData({ ...formData, price_per_item: e.target.value })}
                        placeholder="Price per unit"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 transition"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block mb-2 text-sm font-medium text-gray-300">
                        Supply Date *
                      </label>
                      <input
                        type="date"
                        value={formData.supply_date}
                        onChange={(e) => setFormData({ ...formData, supply_date: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white transition"
                        required
                      />
                    </div>

                    {formData.quantity && formData.price_per_item && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="sm:col-span-2 p-4 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/20"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-300">Total Amount</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formData.quantity} × ₹{formData.price_per_item}
                            </p>
                          </div>
                          <p className="text-3xl font-bold text-white">₹{total.toFixed(2)}</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="sm:col-span-2 flex gap-3">
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 px-6 py-3 rounded-lg bg-linear-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg"
                      >
                        Add Supply & Update Stock
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setSelectedVariety(null);
                          setVarietySearch('');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-3 rounded-lg border border-white/20 text-gray-300 hover:bg-white/10 transition"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERALL STATISTICS - Always Visible */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {initialLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                icon={Boxes}
                title="Total Stock Received"
                value={overallStats.totalQuantity.toFixed(1)}
                subtitle="All-time"
                color="from-blue-500 to-cyan-500"
                delay={0}
              />
              <StatCard
                icon={CheckCircle}
                title="Stock Used"
                value={overallStats.totalUsed.toFixed(1)}
                subtitle={`${overallStats.totalQuantity > 0 ? ((overallStats.totalUsed / overallStats.totalQuantity) * 100).toFixed(1) : 0}% utilized`}
                color="from-green-500 to-emerald-500"
                delay={0.1}
              />
              <StatCard
                icon={RotateCcw}
                title="Stock Returned"
                value={overallStats.totalReturned.toFixed(1)}
                subtitle={`${overallStats.totalQuantity > 0 ? ((overallStats.totalReturned / overallStats.totalQuantity) * 100).toFixed(1) : 0}% returned`}
                color="from-orange-500 to-red-500"
                delay={0.2}
              />
              <StatCard
                icon={Package}
                title="Stock Remaining"
                value={overallStats.totalRemaining.toFixed(1)}
                subtitle="Available now"
                color="from-purple-500 to-pink-500"
                delay={0.3}
              />
              <StatCard
                icon={TrendingUp}
                title="Total Value"
                value={`₹${(overallStats.totalValue / 1000).toFixed(1)}K`}
                subtitle="Investment"
                color="from-indigo-500 to-purple-500"
                delay={0.4}
              />
            </>
          )}
        </div>

        {/* DAILY DETAILS */}
        <GlassCard className="p-5 mb-8" delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Daily Stock Details</h3>
            </div>
            {!loading && <span className="text-sm text-gray-400">{uniqueDates.length} days with activity</span>}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <SkeletonDailyCard key={i} />
              ))}
            </div>
          ) : uniqueDates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No supplies recorded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {uniqueDates.slice(0, 14).map((date, index) => {
                const dayData = inventory.filter(item => item.supply_date === date);
                return (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DailyCard
                      date={date}
                      dayData={dayData}
                      onClick={() => showDailyDetailsModal(date)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          {uniqueDates.length > 14 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-400">
                Showing 14 of {uniqueDates.length} days
              </p>
            </div>
          )}
        </GlassCard>

        {/* MONTH NAVIGATOR */}
        <GlassCard className="p-4 mb-6" delay={0.3}>
          <div className="flex items-center justify-between">
            <motion.button
              onClick={() => changeMonth(-1)}
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            >
              <ChevronLeft size={20} />
            </motion.button>

            <div className="text-center">
              <h3 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              {!isCurrentMonth && (
                <motion.button
                  onClick={goToCurrentMonth}
                  whileHover={{ scale: 1.05 }}
                  className="text-sm text-blue-400 hover:text-blue-300 mt-1 transition"
                >
                  Go to current month
                </motion.button>
              )}
            </div>

            <motion.button
              onClick={() => changeMonth(1)}
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </GlassCard>

        {/* MONTHLY SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {loading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                icon={Package}
                title="Total Supplies This Month"
                value={inventory.length}
                subtitle="deliveries"
                color="from-blue-500 to-cyan-500"
                delay={0}
              />
              <StatCard
                icon={TrendingUp}
                title="Monthly Investment"
                value={`₹${(totalAmount / 1000).toFixed(1)}K`}
                subtitle="spent on supplies"
                color="from-purple-500 to-pink-500"
                delay={0.1}
              />
              <StatCard
                icon={BarChart3}
                title="Active Suppliers"
                value={Object.keys(groupedBySupplier).length}
                subtitle="this month"
                color="from-green-500 to-emerald-500"
                delay={0.2}
              />
            </>
          )}
        </div>

        {/* PROGRESSIVE DISCLOSURE BUTTON */}
        {!loading && inventory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center mb-8"
          >
            <motion.button
              onClick={() => setShowMonthlyInventory(!showMonthlyInventory)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-2xl bg-linear-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 text-white font-semibold shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3">
                <Eye size={20} />
                <span>{showMonthlyInventory ? 'Hide' : 'View'} Monthly Inventory</span>
                <motion.div
                  animate={{ rotate: showMonthlyInventory ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* MONTHLY INVENTORY LIST - Progressive Disclosure */}
        <AnimatePresence>
          {showMonthlyInventory && !loading && inventory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {Object.entries(groupedBySupplier).map(([supplier, items], index) => {
                const supplierTotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);

                return (
                  <motion.div
                    key={supplier}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <GlassCard className="overflow-hidden">
                      <div className="bg-linear-to-r from-blue-500/20 to-purple-500/20 px-6 py-4 border-b border-white/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-white">{supplier}</h3>
                            <p className="text-sm text-gray-400">{items.length} deliveries</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Total Amount</p>
                            <p className="text-2xl font-bold text-white">₹{supplierTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile: Card View */}
                      <div className="block lg:hidden divide-y divide-white/10">
                        {items.map((item) => (
                          <motion.div
                            key={item.id}
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                            className="p-4 transition"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white text-sm">{item.variety.name}</h4>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                                    {item.variety.measurement_unit}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {new Date(item.supply_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <motion.button
                                onClick={() => handleDelete(item.id)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Quantity</span>
                                <span className="text-white font-semibold">{parseFloat(item.quantity).toFixed(1)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Price/Unit</span>
                                <span className="text-white font-semibold">₹{parseFloat(item.price_per_item).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Total</span>
                                <span className="text-white font-semibold">₹{parseFloat(item.total_amount).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Used</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                  {parseFloat(item.quantity_used).toFixed(1)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Returned</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                  {parseFloat(item.quantity_returned || 0).toFixed(1)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Remaining</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                  {parseFloat(item.quantity_remaining).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Desktop: Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Variety</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Price/Unit</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Total</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Used</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Returns</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Remaining</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {items.map((item, idx) => (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', scale: 1.01 }}
                                className="transition-all"
                              >
                                <td className="px-4 py-3 text-gray-400">
                                  {new Date(item.supply_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-white">{item.variety.name}</div>
                                  <div className="text-xs text-gray-400 capitalize">{item.variety.measurement_unit}</div>
                                </td>
                                <td className="px-4 py-3 text-center font-medium text-white">{parseFloat(item.quantity).toFixed(1)}</td>
                                <td className="px-4 py-3 text-right text-white">₹{parseFloat(item.price_per_item).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-white">
                                  ₹{parseFloat(item.total_amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                    {parseFloat(item.quantity_used).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                    {parseFloat(item.quantity_returned || 0).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                    {parseFloat(item.quantity_remaining).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <motion.button
                                    onClick={() => handleDelete(item.id)}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition"
                                  >
                                    <Trash2 size={18} />
                                  </motion.button>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* EMPTY STATE */}
        {!loading && inventory.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="text-center py-16">
              <div className="w-20 h-20 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-gray-400" size={40} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No supplies for this month</h3>
              <p className="text-gray-400 text-sm">Add your first supply to get started</p>
            </GlassCard>
          </motion.div>
        )}

        {/* DAILY DETAILS MODAL */}
        <AnimatePresence>
          {showDailyDetails && selectedDate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDailyDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-linear-to-br from-gray-900/95 to-blue-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20"
              >
                {/* Modal Header */}
                <div className="bg-linear-to-r from-blue-500/30 to-purple-500/30 px-6 py-5 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Daily Stock Details</h3>
                      <p className="text-blue-200 text-sm mt-1">
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setShowDailyDetails(false)}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                    >
                      <X size={24} />
                    </motion.button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/10">
                  <div className="text-center">
                    <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{dailyQuantity.toFixed(1)}</p>
                    <p className="text-sm text-gray-400">Total Quantity</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">₹{dailyTotal.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Total Value</p>
                  </div>
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{dailyInventory.length}</p>
                    <p className="text-sm text-gray-400">Supplies</p>
                  </div>
                </div>

                {/* Details List */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-4">
                    {dailyInventory.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-white text-lg">{item.supplier_name}</h4>
                            <p className="text-sm text-gray-400 capitalize">{item.variety.name} • {item.variety.measurement_unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-400">₹{parseFloat(item.total_amount).toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Total Amount</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Quantity</p>
                            <p className="text-lg font-bold text-white">{parseFloat(item.quantity).toFixed(1)}</p>
                          </div>
                          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Used</p>
                            <p className="text-lg font-bold text-blue-400">{parseFloat(item.quantity_used).toFixed(1)}</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Returned</p>
                            <p className="text-lg font-bold text-red-400">{parseFloat(item.quantity_returned || 0).toFixed(1)}</p>
                          </div>
                          <div className="bg-green-500/10 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Remaining</p>
                            <p className="text-lg font-bold text-green-400">{parseFloat(item.quantity_remaining).toFixed(1)}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
                          <span className="text-gray-400">
                            Price/Unit: <span className="font-semibold text-white">₹{parseFloat(item.price_per_item).toFixed(2)}</span>
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            parseFloat(item.quantity_remaining) > 0
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {parseFloat(item.quantity_remaining) > 0 ? 'In Stock' : 'Fully Used'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-white/10 px-6 py-4 bg-gray-900/50">
                  <motion.button
                    onClick={() => setShowDailyDetails(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}