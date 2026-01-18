import { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Trash2, TrendingUp, Package, 
  ChevronLeft, ChevronRight, Eye, X, BarChart3,
  Boxes, RotateCcw, CheckCircle, AlertCircle, Search
} from 'lucide-react';
import api from '../api/api'; // ✅ USING AUTHENTICATED API

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EnhancedSupplierInventory() {
  const [varieties, setVarieties] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allInventory, setAllInventory] = useState([]); // For overall stats
  const [loading, setLoading] = useState(false);
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
    loadAllInventory(); // Load all-time inventory for stats
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
    } catch (error) {
      console.error('Error loading all inventory:', error);
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

  // Calculate overall statistics
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

  // Get unique dates for daily view
  const uniqueDates = [...new Set(inventory.map(item => item.supply_date))].sort().reverse();

  // Filter inventory by selected date
  const dailyInventory = selectedDate 
    ? inventory.filter(item => item.supply_date === selectedDate)
    : [];

  const dailyTotal = dailyInventory.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
  const dailyQuantity = dailyInventory.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800 tracking-tight">
              Supplier Inventory Analytics
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Complete stock overview and daily tracking
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-5 py-2.5 rounded-lg bg-gray-800 text-gray-100 font-medium hover:bg-gray-900 transition shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Add Supply
          </button>
        </div>

        {/* Overall Statistics - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Boxes className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Stock Received</p>
            <p className="text-3xl font-bold">{overallStats.totalQuantity.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">All-time</p>
          </div>

          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Stock Used</p>
            <p className="text-3xl font-bold">{overallStats.totalUsed.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">
              {overallStats.totalQuantity > 0 ? ((overallStats.totalUsed / overallStats.totalQuantity) * 100).toFixed(1) : 0}% utilized
            </p>
          </div>

          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <RotateCcw className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Stock Returned</p>
            <p className="text-3xl font-bold">{overallStats.totalReturned.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">
              {overallStats.totalQuantity > 0 ? ((overallStats.totalReturned / overallStats.totalQuantity) * 100).toFixed(1) : 0}% returned
            </p>
          </div>

          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Stock Remaining</p>
            <p className="text-3xl font-bold">{overallStats.totalRemaining.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">Available now</p>
          </div>

          <div className="bg-linear-to-br from-gray-700 to-gray-800 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Value</p>
            <p className="text-3xl font-bold">₹{(overallStats.totalValue / 1000).toFixed(1)}K</p>
            <p className="text-xs opacity-75 mt-1">Investment</p>
          </div>
        </div>

        {/* Daily Details Quick Access */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Daily Stock Details</h3>
            </div>
            <span className="text-sm text-gray-500">{uniqueDates.length} days with activity</span>
          </div>

          {uniqueDates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No supplies recorded yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {uniqueDates.slice(0, 14).map(date => {
                  const dayData = inventory.filter(item => item.supply_date === date);
                  const dayTotal = dayData.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
                  
                  return (
                    <button
                      key={date}
                      onClick={() => showDailyDetailsModal(date)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {dayTotal.toFixed(0)} units
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {dayData.length} {dayData.length === 1 ? 'supply' : 'supplies'}
                      </div>
                      <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition mt-1 flex items-center gap-1">
                        <Eye size={12} />
                        View Details
                      </div>
                    </button>
                  );
                })}
              </div>

              {uniqueDates.length > 14 && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-500">
                    Showing 14 of {uniqueDates.length} days
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Month Navigator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 tracking-tight">
                {monthNames[currentMonth]} {currentYear}
              </h3>

              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="mt-1 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  Go to current month
                </button>
              )}
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Total Supplies This Month</p>
            <h3 className="text-3xl font-semibold text-gray-800 mt-1">
              {inventory.length}
            </h3>
            <p className="text-sm text-gray-500 mt-1">deliveries</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Monthly Investment</p>
            <h3 className="text-3xl font-semibold text-gray-800 mt-1">
              ₹{(totalAmount / 1000).toFixed(1)}K
            </h3>
            <p className="text-sm text-gray-500 mt-1">spent on supplies</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Active Suppliers</p>
            <h3 className="text-3xl font-semibold text-gray-800 mt-1">
              {Object.keys(groupedBySupplier).length}
            </h3>
            <p className="text-sm text-gray-500 mt-1">this month</p>
          </div>
        </div>

        {/* Supply Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Record New Supply
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_name: e.target.value })
                    }
                    placeholder="Enter supplier name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 transition"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 transition"
                    required
                  />

                  {showVarietyDropdown && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                      {filteredVarieties.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500">
                          No varieties found
                        </div>
                      ) : (
                        filteredVarieties.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleVarietySelect(v)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-800">
                              {v.name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {v.measurement_unit}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Quantity {selectedVariety && `(${selectedVariety.measurement_unit})`} *
                  </label>
                  <input
                    type="number"
                    min="0.01"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 transition"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Supply Date *
                  </label>
                  <input
                    type="date"
                    value={formData.supply_date}
                    onChange={(e) =>
                      setFormData({ ...formData, supply_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-400/20 transition"
                    required
                  />
                </div>

                {formData.quantity && formData.price_per_item && (
                  <div className="md:col-span-2 p-4 bg-gray-100 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Total Amount
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.quantity} × ₹{formData.price_per_item}
                        </p>
                      </div>
                      <p className="text-3xl font-semibold text-gray-800">
                        ₹{total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg bg-gray-800 text-gray-100 font-medium hover:bg-gray-900 transition"
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
                    className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Monthly Inventory List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No supplies for this month</h3>
              <p className="text-gray-500">Add your first supply to get started</p>
            </div>
          ) : (
            Object.entries(groupedBySupplier).map(([supplier, items]) => {
              const supplierTotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);

              return (
                <div key={supplier} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {supplier}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {items.length} deliveries
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-2xl font-semibold text-gray-800">
                          ₹{supplierTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 text-gray-600 text-xs">
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
                          <tr key={item.id} className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/30 transition`}>
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(item.supply_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">
                                {item.variety.name}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {item.variety.measurement_unit}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center font-medium text-gray-700">
                              {parseFloat(item.quantity).toFixed(1)}
                            </td>

                            <td className="px-4 py-3 text-right text-gray-700">
                              ₹{parseFloat(item.price_per_item).toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-gray-800">
                              ₹{parseFloat(item.total_amount).toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {parseFloat(item.quantity_used).toFixed(1)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                {parseFloat(item.quantity_returned || 0).toFixed(1)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                {parseFloat(item.quantity_remaining).toFixed(1)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 hover:text-red-400 transition"
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

        {/* Daily Details Modal */}
        {showDailyDetails && selectedDate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-5 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">Daily Stock Details</h3>
                  <p className="text-blue-100 text-sm mt-1">
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
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200">
                <div className="text-center">
                  <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{dailyQuantity.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">₹{dailyTotal.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </div>
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{dailyInventory.length}</p>
                  <p className="text-sm text-gray-600">Supplies</p>
                </div>
              </div>

              {/* Details List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {dailyInventory.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{item.supplier_name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{item.variety.name} • {item.variety.measurement_unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-600">₹{parseFloat(item.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Total Amount</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">Quantity</p>
                          <p className="text-lg font-bold text-gray-900">{parseFloat(item.quantity).toFixed(1)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">Used</p>
                          <p className="text-lg font-bold text-blue-700">{parseFloat(item.quantity_used).toFixed(1)}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">Returned</p>
                          <p className="text-lg font-bold text-red-700">{parseFloat(item.quantity_returned || 0).toFixed(1)}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">Remaining</p>
                          <p className="text-lg font-bold text-green-700">{parseFloat(item.quantity_remaining).toFixed(1)}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                        <span className="text-gray-600">
                          Price/Unit: <span className="font-semibold text-gray-900">₹{parseFloat(item.price_per_item).toFixed(2)}</span>
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          parseFloat(item.quantity_remaining) > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {parseFloat(item.quantity_remaining) > 0 ? 'In Stock' : 'Fully Used'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <button
                  onClick={() => setShowDailyDetails(false)}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium"
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