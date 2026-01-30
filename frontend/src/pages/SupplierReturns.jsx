// frontend/src/pages/SupplierReturns.jsx - MODERN GLASSMORPHISM DESIGN WITH PROGRESSIVE DISCLOSURE
import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingDown, RotateCcw, ChevronLeft, ChevronRight, AlertCircle, X, Eye, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';

import { SkeletonStatCard, SkeletonGroupCard } from '../components/skeleton/UnifiedSkeleton';

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
    <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-orange-500/5 rounded-2xl" />
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

export default function ModernSupplierReturns() {
  const [varieties, setVarieties] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReturns, setShowReturns] = useState(false); // Progressive disclosure
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    supplier_name: '',
    variety_id: '',
    quantity: '',
    price_per_item: '',
    return_date: formatDate(new Date()),
    reason: ''
  });

  const [varietySearch, setVarietySearch] = useState('');
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [availableStock, setAvailableStock] = useState(null);
  const [supplierInventories, setSupplierInventories] = useState([]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadVarieties();
    loadSupplierInventories();
  }, []);

  useEffect(() => {
    loadMonthlyReturns();
  }, [currentMonth, currentYear]);

  const loadVarieties = async () => {
    try {
      const response = await api.get('/varieties/');
      setVarieties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadSupplierInventories = async () => {
    try {
      const response = await api.get('/supplier/inventory');
      setSupplierInventories(Array.isArray(response.data) ? response.data : []);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error loading supplier inventories:', error);
      setInitialLoading(false);
    }
  };

  const loadMonthlyReturns = async () => {
    setLoading(true);
    try {
      const response = await api.get('/supplier/returns');
      const data = response.data;
      
      const filtered = (Array.isArray(data) ? data : []).filter(item => {
        const itemDate = new Date(item.return_date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      }).sort((a, b) => new Date(b.return_date) - new Date(a.return_date));
      
      setReturns(filtered);
    } catch (error) {
      console.error('Error loading returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVarietySelect = (variety) => {
    setFormData({ ...formData, variety_id: variety.id });
    setVarietySearch(variety.name);
    setSelectedVariety(variety);
    setShowVarietyDropdown(false);
    
    if (formData.supplier_name) {
      fetchSupplierPrice(formData.supplier_name, variety.id);
    }
  };

  const handleSupplierChange = (supplierName) => {
    setFormData({ ...formData, supplier_name: supplierName });
    
    if (selectedVariety) {
      fetchSupplierPrice(supplierName, selectedVariety.id);
    }
  };

  const fetchSupplierPrice = (supplierName, varietyId) => {
    const matchingInventories = supplierInventories.filter(inv => 
      inv.supplier_name.toLowerCase() === supplierName.toLowerCase() &&
      inv.variety_id === varietyId &&
      parseFloat(inv.quantity_remaining) > 0
    ).sort((a, b) => new Date(b.supply_date) - new Date(a.supply_date));

    if (matchingInventories.length > 0) {
      const latestInventory = matchingInventories[0];
      const totalAvailable = matchingInventories.reduce((sum, inv) => 
        sum + parseFloat(inv.quantity_remaining), 0
      );
      
      setFormData(prev => ({
        ...prev,
        price_per_item: latestInventory.price_per_item.toString()
      }));
      
      setAvailableStock({
        quantity: totalAvailable,
        price: parseFloat(latestInventory.price_per_item),
        unit: selectedVariety?.measurement_unit || 'units'
      });
    } else {
      setAvailableStock(null);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price_per_item) || 0;
    return qty * price;
  };

  const total = calculateTotal();

  const handleSubmit = async () => {
    if (!formData.supplier_name || !formData.variety_id || !formData.quantity || !formData.price_per_item) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/supplier/returns', {
        ...formData,
        variety_id: parseInt(formData.variety_id),
        quantity: parseFloat(formData.quantity),
        price_per_item: parseFloat(formData.price_per_item)
      });

      alert('Return recorded successfully! Stock deducted.');
      setFormData({
        supplier_name: '',
        variety_id: '',
        quantity: '',
        price_per_item: '',
        return_date: formatDate(new Date()),
        reason: ''
      });
      setVarietySearch('');
      setSelectedVariety(null);
      setShowForm(false);
      loadMonthlyReturns();
    } catch (error) {
      console.error('Failed to record return:', error);
      alert(error.response?.data?.detail || 'Failed to record return');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this return record? This will restore stock levels.')) return;
    
    try {
      await api.delete(`/supplier/returns/${id}`);
      loadMonthlyReturns();
      alert('Return deleted! Stock restored.');
    } catch (error) {
      console.error('Failed to delete return:', error);
      alert('Failed to delete return');
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

  const groupedBySupplier = returns.reduce((acc, item) => {
    if (!acc[item.supplier_name]) {
      acc[item.supplier_name] = [];
    }
    acc[item.supplier_name].push(item);
    return acc;
  }, {});

  const totalAmount = returns.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const isCurrentMonth = currentMonth === new Date().getMonth() && 
                         currentYear === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-red-900/20 to-orange-900/20 dark:from-gray-950 dark:via-red-950/30 dark:to-orange-950/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
              <h1 className="text-4xl sm:text-5xl font-bold bg-linear-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
                Supplier Returns
              </h1>
              <p className="text-gray-400 dark:text-gray-500">
                Track returns to suppliers and refunds
              </p>
            </div>

            <motion.button
              onClick={() => setShowForm(!showForm)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group px-6 py-3 rounded-xl bg-linear-to-r from-red-500 to-orange-500 text-white font-semibold shadow-lg overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                <Plus size={20} />
                <span>Record Return</span>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* RETURN FORM */}
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
                  <h3 className="text-xl font-semibold text-white">Record Return to Supplier</h3>
                  <motion.button
                    onClick={() => setShowForm(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400"
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_name}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      placeholder="Enter supplier name"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition"
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
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition"
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
                      min="1"
                      step={selectedVariety?.measurement_unit !== 'pieces' ? '0.01' : '1'}
                      max={availableStock ? availableStock.quantity : undefined}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder={selectedVariety ? `Enter ${selectedVariety.measurement_unit}` : 'Select variety first'}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition"
                    />
                    {availableStock && (
                      <p className="text-xs text-gray-400 mt-1">
                        Max available: {availableStock.quantity.toFixed(1)} {availableStock.unit}
                      </p>
                    )}
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
                      placeholder={availableStock ? "Price auto-filled" : "Price per unit"}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Return Date *</label>
                    <input
                      type="date"
                      value={formData.return_date}
                      onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white transition"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Reason for Return</label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="e.g., Defective, Wrong item"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition"
                    />
                  </div>

                  {formData.quantity && formData.price_per_item && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="md:col-span-2 p-4 bg-linear-to-r from-red-500/20 to-orange-500/20 rounded-lg border border-white/20"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-300">Refund Amount</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formData.quantity} × ₹{formData.price_per_item}
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-white">₹{total.toFixed(2)}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="md:col-span-2 flex gap-3">
                    <motion.button
                      onClick={handleSubmit}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-6 py-3 rounded-lg bg-linear-to-r from-red-500 to-orange-500 text-white font-medium shadow-lg"
                    >
                      Record Return & Deduct Stock
                    </motion.button>
                    <motion.button
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
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MONTH NAVIGATOR */}
        <GlassCard className="p-4 mb-6" delay={0.1}>
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
              <h3 className="text-2xl font-bold bg-linear-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              {!isCurrentMonth && (
                <motion.button
                  onClick={goToCurrentMonth}
                  whileHover={{ scale: 1.05 }}
                  className="text-sm text-red-400 hover:text-red-300 mt-1 transition"
                >
                  Go to Current Month
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

        {/* SUMMARY CARDS - Always Visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {initialLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                icon={RotateCcw}
                title="Total Returns"
                value={returns.length}
                subtitle="returns this month"
                color="from-red-500 to-orange-500"
                delay={0}
              />
              <StatCard
                icon={TrendingDown}
                title="Return Value"
                value={`₹${(totalAmount / 1000).toFixed(1)}K`}
                subtitle="refunded to suppliers"
                color="from-orange-500 to-yellow-500"
                delay={0.1}
              />
              <StatCard
                icon={AlertCircle}
                title="Suppliers"
                value={Object.keys(groupedBySupplier).length}
                subtitle="with returns"
                color="from-yellow-500 to-red-500"
                delay={0.2}
              />
            </>
          )}
        </div>

        {/* PROGRESSIVE DISCLOSURE BUTTON */}
        {!loading && returns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center mb-8"
          >
            <motion.button
              onClick={() => setShowReturns(!showReturns)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-2xl bg-linear-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-white/20 text-white font-semibold shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3">
                <Eye size={20} />
                <span>{showReturns ? 'Hide' : 'View'} Return Records</span>
                <motion.div
                  animate={{ rotate: showReturns ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* RETURNS LIST - Progressive Disclosure */}
        <AnimatePresence>
          {showReturns && !loading && returns.length > 0 && (
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
                      <div className="bg-linear-to-r from-red-500/20 to-orange-500/20 px-6 py-4 border-b border-white/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-white">{supplier}</h3>
                            <p className="text-sm text-gray-400">{items.length} returns</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Total Refund</p>
                            <p className="text-2xl font-bold text-red-400">₹{supplierTotal.toFixed(2)}</p>
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
                                <div className="font-medium text-white">{item.variety.name}</div>
                                <div className="text-xs text-gray-400 capitalize mt-0.5">{item.variety.measurement_unit}</div>
                              </div>
                              <motion.button
                                onClick={() => handleDelete(item.id)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Date:</span>
                                <div className="font-medium text-white">
                                  {new Date(item.return_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Quantity:</span>
                                <div className="font-medium text-white">{parseFloat(item.quantity).toFixed(1)}</div>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Price/Unit:</span>
                                <div className="font-medium text-white">₹{parseFloat(item.price_per_item).toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">Total:</span>
                                <div className="font-semibold text-red-400">₹{parseFloat(item.total_amount).toFixed(2)}</div>
                              </div>
                            </div>
                            
                            {item.reason && (
                              <div className="mt-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                  {item.reason}
                                </span>
                              </div>
                            )}
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
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Reason</th>
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
                                  {new Date(item.return_date).toLocaleDateString('en-US', { 
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
                                <td className="px-4 py-3 text-right font-semibold text-red-400">
                                  ₹{parseFloat(item.total_amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  {item.reason ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                      {item.reason}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">No reason</span>
                                  )}
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
        {!loading && returns.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="text-center py-16">
              <div className="w-20 h-20 bg-linear-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="text-gray-400" size={40} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No returns for this month</h3>
              <p className="text-gray-400 text-sm">Great! No items needed to be returned</p>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}