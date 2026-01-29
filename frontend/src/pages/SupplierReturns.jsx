import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingDown, RotateCcw, ChevronLeft, ChevronRight, AlertCircle, X, Sun, Moon } from 'lucide-react';
import api from '../api/api';

import { SkeletonStatCard, SkeletonGroupCard } from '../components/skeleton/UnifiedSkeleton'

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Theme Hook
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};

export default function MonthlySupplierReturns() {
  const { theme, toggleTheme } = useTheme();
  const [varieties, setVarieties] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER WITH THEME TOGGLE */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Supplier Returns</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track returns to suppliers and refunds</p>
            </div>
            <div className="flex items-center gap-2">

              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition shadow-lg active:scale-95"
              >
                <Plus size={18} />
                <span className="text-sm sm:text-base">Record Return</span>
              </button>
            </div>
          </div>
        </div>

        {/* RETURN FORM */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Record Return to Supplier</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition lg:hidden text-gray-600 dark:text-gray-300"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              
              <div>
                <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                />
                {availableStock && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Max available: {availableStock.quantity.toFixed(1)} {availableStock.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price per {selectedVariety ? selectedVariety.measurement_unit.slice(0, -1) : 'Unit'} (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_per_item}
                  onChange={(e) => setFormData({ ...formData, price_per_item: e.target.value })}
                  placeholder={availableStock ? "Price auto-filled" : "Price per unit"}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                />
              </div>

              <div>
                <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Return Date *</label>
                <input
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                />
              </div>

              <div>
                <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Return</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., Defective, Wrong item"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                />
              </div>

              {formData.quantity && formData.price_per_item && (
                <div className="md:col-span-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-300">Refund Amount</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {formData.quantity} × ₹{formData.price_per_item}
                      </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400">₹{total.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-red-600 text-white text-sm sm:text-base font-medium hover:bg-red-700 transition shadow-lg active:scale-95"
                >
                  Record Return & Deduct Stock
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedVariety(null);
                    setVarietySearch('');
                  }}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm sm:text-base hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MONTH NAVIGATOR */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition active:scale-95 text-gray-700 dark:text-gray-300"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="text-center flex-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1 hover:underline"
                >
                  Go to Current Month
                </button>
              )}
            </div>
            
            <button
              onClick={() => changeMonth(1)}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition active:scale-95 text-gray-700 dark:text-gray-300"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS - With Unified Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          {initialLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Total Returns</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-gray-100 mt-1">
                      {returns.length}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-100 dark:bg-gray-700 rounded-lg">
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">returns this month</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Return Value</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-gray-100 mt-1">
                      ₹{(totalAmount / 1000).toFixed(1)}K
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-100 dark:bg-gray-700 rounded-lg">
                    <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">refunded to suppliers</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-700 shadow-sm sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Suppliers</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-gray-100 mt-1">
                      {Object.keys(groupedBySupplier).length}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-100 dark:bg-gray-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">with returns</p>
              </div>
            </>
          )}
        </div>

        {/* RETURNS LIST - With Unified Skeleton */}
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="space-y-4 sm:space-y-6">
              <SkeletonGroupCard rows={3} />
              <SkeletonGroupCard rows={3} />
            </div>
          ) : returns.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <RotateCcw size={48} className="sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No returns for this month</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Great! No items needed to be returned</p>
            </div>
          ) : (
            Object.entries(groupedBySupplier).map(([supplier, items]) => {
              const supplierTotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
              
              return (
                <div key={supplier} className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">{supplier}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{items.length} returns</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Refund</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">₹{supplierTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.variety.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{item.variety.measurement_unit}</div>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition active:scale-95"
                            aria-label="Delete return"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Date:</span>
                            <div className="font-medium text-gray-700 dark:text-gray-300">
                              {new Date(item.return_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                            <div className="font-medium text-gray-700 dark:text-gray-300">{parseFloat(item.quantity).toFixed(1)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Price/Unit:</span>
                            <div className="font-medium text-gray-700 dark:text-gray-300">₹{parseFloat(item.price_per_item).toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Total:</span>
                            <div className="font-semibold text-red-700 dark:text-red-400">₹{parseFloat(item.total_amount).toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {item.reason && (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                              {item.reason}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Variety</th>
                          <th className="px-4 py-3 text-center">Quantity</th>
                          <th className="px-4 py-3 text-right">Price/Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-left">Reason</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {items.map((item, idx) => (
                          <tr key={item.id} className={`border-t dark:border-gray-700 ${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-800/50"} hover:bg-red-50/30 dark:hover:bg-red-900/10 transition`}>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {new Date(item.return_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{item.variety.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.variety.measurement_unit}</div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-gray-100">{parseFloat(item.quantity).toFixed(1)}</td>
                            <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">₹{parseFloat(item.price_per_item).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-red-700 dark:text-red-400">
                              ₹{parseFloat(item.total_amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              {item.reason ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                                  {item.reason}
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-xs">No reason</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}