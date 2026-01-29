// frontend/src/pages/SupplierInventory.jsx - WITH SKELETON LOADING UI
import { useState, useEffect } from 'react';
import {
  Plus, Calendar, Trash2, TrendingUp, Package,
  ChevronLeft, ChevronRight, Eye, X, BarChart3,
  Boxes, RotateCcw, CheckCircle, AlertCircle, Search
} from 'lucide-react';
import api from '../api/api';
import { SkeletonStatCard, SkeletonDailyCard, SkeletonMonthlyCard, SkeletonSupplierCard } from '../components/skeleton/InventorySkeleton'

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EnhancedSupplierInventory() {
  const [varieties, setVarieties] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allInventory, setAllInventory] = useState([]);
  const [loading, setLoading] = useState(true); // Changed to true initially
  const [initialLoading, setInitialLoading] = useState(true); // New state for initial load
  const [showForm, setShowForm] = useState(false);
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

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
      setInitialLoading(false); // Initial load complete
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER - Responsive */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
              Supplier Inventory Analytics
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete stock overview and daily tracking
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto flex items-center justify-center px-4 sm:px-5 py-2.5 rounded-lg bg-gray-800 dark:bg-gray-700 text-gray-100 dark:text-gray-100 font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition shadow-sm text-sm sm:text-base"
          >
            <Plus size={18} className="mr-2" />
            Add Supply
          </button>
        </div>

        {/* SUPPLY FORM - Responsive Modal */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">
              Record New Supply
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_name: e.target.value })
                    }
                    placeholder="Enter supplier name"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                    required
                  />

                  {showVarietyDropdown && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                      {filteredVarieties.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                          No varieties found
                        </div>
                      ) : (
                        filteredVarieties.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleVarietySelect(v)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                              {v.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {v.measurement_unit}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity {selectedVariety && `(${selectedVariety.measurement_unit})`} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={selectedVariety?.measurement_unit !== 'pieces' ? '0.01' : '1'}
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder={
                      selectedVariety
                        ? `Enter ${selectedVariety.measurement_unit}`
                        : 'Select variety first'
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price per {selectedVariety
                      ? selectedVariety.measurement_unit.slice(0, -1)
                      : 'Unit'} (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_item}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_item: e.target.value })
                    }
                    placeholder="Price per unit"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supply Date *
                  </label>
                  <input
                    type="date"
                    value={formData.supply_date}
                    onChange={(e) =>
                      setFormData({ ...formData, supply_date: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                    required
                  />
                </div>

                {formData.quantity && formData.price_per_item && (
                  <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gray-800 dark:bg-gray-700 text-gray-100 font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition text-sm sm:text-base"
                    >
                      Add Supply & Update Stock
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedVariety(null);
                        setVarietySearch('');
                      }}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* 📱 OVERALL STATISTICS - With Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {initialLoading ? (
            // Show skeleton cards during initial load
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              {/* TOTAL STOCK RECEIVED */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400">
                  <Boxes className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Total Stock Received
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  {overallStats.totalQuantity.toFixed(1)}
                </p>
                <p className="text-xs text-slate-400 mt-1">All-time</p>
              </div>

              {/* STOCK USED */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400">
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Stock Used
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  {overallStats.totalUsed.toFixed(1)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {overallStats.totalQuantity > 0
                    ? ((overallStats.totalUsed / overallStats.totalQuantity) * 100).toFixed(1)
                    : 0}% utilized
                </p>
              </div>

              {/* STOCK RETURNED */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400">
                  <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Stock Returned
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  {overallStats.totalReturned.toFixed(1)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {overallStats.totalQuantity > 0
                    ? ((overallStats.totalReturned / overallStats.totalQuantity) * 100).toFixed(1)
                    : 0}% returned
                </p>
              </div>

              {/* STOCK REMAINING */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400">
                  <Package className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Stock Remaining
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  {overallStats.totalRemaining.toFixed(1)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Available now</p>
              </div>

              {/* TOTAL VALUE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Total Value
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  ₹{(overallStats.totalValue / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-slate-400 mt-1">Investment</p>
              </div>
            </>

          )}
        </div>

        {/* 📱 DAILY DETAILS - With Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">Daily Stock Details</h3>
            </div>
            {!loading && <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{uniqueDates.length} days with activity</span>}
          </div>

          {loading ? (
            // Skeleton for daily details
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <SkeletonDailyCard key={i} />
              ))}
            </div>
          ) : uniqueDates.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-400 dark:text-gray-500">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No supplies recorded yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {uniqueDates.slice(0, 14).map(date => {
                  const dayData = inventory.filter(item => item.supply_date === date);
                  const dayTotal = dayData.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

                  return (
                    <button
                      key={date}
                      onClick={() => showDailyDetailsModal(date)}
                      className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left group"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {dayTotal.toFixed(0)} units
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {dayData.length} {dayData.length === 1 ? 'supply' : 'supplies'}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition mt-1 flex items-center gap-1">
                        <Eye size={12} />
                        View
                      </div>
                    </button>
                  );
                })}
              </div>

              {uniqueDates.length > 14 && (
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Showing 14 of {uniqueDates.length} days
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* MONTH NAVIGATOR - Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
                {monthNames[currentMonth]} {currentYear}
              </h3>

              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
                >
                  Go to current month
                </button>
              )}
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* MONTHLY SUMMARY - With Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {loading ? (
            <>
              <SkeletonMonthlyCard />
              <SkeletonMonthlyCard />
              <SkeletonMonthlyCard />
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Supplies This Month</p>
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 mt-1">
                  {inventory.length}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">deliveries</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Investment</p>
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 mt-1">
                  ₹{(totalAmount / 1000).toFixed(1)}K
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">spent on supplies</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Active Suppliers</p>
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 mt-1">
                  {Object.keys(groupedBySupplier).length}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">this month</p>
              </div>
            </>
          )}
        </div>

        {/* MONTHLY INVENTORY LIST - With Skeleton */}
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            // Skeleton for supplier cards
            <>
              <SkeletonSupplierCard />
              <SkeletonSupplierCard />
            </>
          ) : inventory.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No supplies for this month</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Add your first supply to get started</p>
            </div>
          ) : (
            Object.entries(groupedBySupplier).map(([supplier, items]) => {
              const supplierTotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);

              return (
                <div key={supplier} className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">{supplier}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{items.length} deliveries</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">₹{supplierTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* 📱 Mobile: Card View */}
                  <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, idx) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                {item.variety.name}
                              </h4>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                                {item.variety.measurement_unit}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(item.supply_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-2"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Quantity</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">{parseFloat(item.quantity).toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Price/Unit</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">₹{parseFloat(item.price_per_item).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Total</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">₹{parseFloat(item.total_amount).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Used</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              {parseFloat(item.quantity_used).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Returned</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                              {parseFloat(item.quantity_returned || 0).toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Remaining</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              {parseFloat(item.quantity_remaining).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Variety</th>
                          <th className="px-4 py-3 text-center">Quantity</th>
                          <th className="px-4 py-3 text-right">Price/Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Used</th>
                          <th className="px-4 py-3 text-center">Returns</th>
                          <th className="px-4 py-3 text-center">Remaining</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {items.map((item, idx) => (
                          <tr key={item.id} className={`border-t ${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"} hover:bg-gray-100 dark:hover:bg-gray-600 transition`}>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {new Date(item.supply_date).toLocaleDateString('en-US', {
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
                            <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                              ₹{parseFloat(item.total_amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {parseFloat(item.quantity_used).toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                                {parseFloat(item.quantity_returned || 0).toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                {parseFloat(item.quantity_remaining).toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-400 transition"
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

        {/* 📱 DAILY DETAILS MODAL - Responsive */}
        {showDailyDetails && selectedDate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-linear-to-r from-blue-500 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Daily Stock Details</h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowDailyDetails(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{dailyQuantity.toFixed(1)}</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Quantity</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">₹{dailyTotal.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                </div>
                <div className="text-center">
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{dailyInventory.length}</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Supplies</p>
                </div>
              </div>

              {/* Details List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {dailyInventory.map((item) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-blue-500 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">{item.supplier_name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 capitalize">{item.variety.name} • {item.variety.measurement_unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">₹{parseFloat(item.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{parseFloat(item.quantity).toFixed(1)}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Used</p>
                          <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400">{parseFloat(item.quantity_used).toFixed(1)}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 sm:p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Returned</p>
                          <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-400">{parseFloat(item.quantity_returned || 0).toFixed(1)}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
                          <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400">{parseFloat(item.quantity_remaining).toFixed(1)}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Price/Unit: <span className="font-semibold text-gray-900 dark:text-gray-100">₹{parseFloat(item.price_per_item).toFixed(2)}</span>
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium self-start sm:self-auto ${parseFloat(item.quantity_remaining) > 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                          {parseFloat(item.quantity_remaining) > 0 ? 'In Stock' : 'Fully Used'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={() => setShowDailyDetails(false)}
                  className="w-full px-4 py-2.5 sm:py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition font-medium text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}