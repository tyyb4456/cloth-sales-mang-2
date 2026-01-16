import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, TrendingUp, Package, ChevronLeft, ChevronRight } from 'lucide-react';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function MonthlySupplierInventory() {
  const [varieties, setVarieties] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Month/Year selection
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
  }, []);

  useEffect(() => {
    loadMonthlyInventory();
  }, [currentMonth, currentYear]);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/varieties/`);
      const data = await response.json();
      setVarieties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadMonthlyInventory = async () => {
    setLoading(true);
    try {
      // Get all inventory and filter by month
      const response = await fetch(`${API_BASE_URL}/supplier/inventory`);
      const data = await response.json();

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

  const handleSubmit = async () => {
    if (!formData.supplier_name || !formData.variety_id || !formData.quantity || !formData.price_per_item) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/supplier/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variety_id: parseInt(formData.variety_id),
          quantity: parseFloat(formData.quantity),
          price_per_item: parseFloat(formData.price_per_item)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add inventory');
      }

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
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this inventory record? This will reduce stock levels.')) return;

    try {
      await fetch(`${API_BASE_URL}/supplier/inventory/${id}`, { method: 'DELETE' });
      loadMonthlyInventory();
      alert('Inventory deleted! Stock restored.');
    } catch (error) {
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

  // Group by supplier
  const groupedBySupplier = inventory.reduce((acc, item) => {
    if (!acc[item.supplier_name]) {
      acc[item.supplier_name] = [];
    }
    acc[item.supplier_name].push(item);
    return acc;
  }, {});

  const totalAmount = inventory.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
  const totalQuantities = inventory.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const isCurrentMonth = currentMonth === new Date().getMonth() &&
    currentYear === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 tracking-tight">
              Supplier Inventory
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Monthly tracking of supplier deliveries
            </p>

          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-5 py-2.5 rounded-lg 
bg-slate-800 text-slate-100 font-medium 
hover:bg-slate-900 transition shadow-sm"

          >
            <Plus size={18} className="mr-2" />
            Add Supply
          </button>
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
              <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">
                {monthNames[currentMonth]} {currentYear}
              </h3>

              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="mt-1 text-sm text-slate-500 hover:text-slate-700 transition"
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Total Supplies */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Supplies</p>
                <h3 className="text-3xl font-semibold text-slate-800 mt-1">
                  {inventory.length}
                </h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <Package className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <p className="text-sm text-slate-500">deliveries this month</p>
          </div>

          {/* Total Amount */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Amount</p>
                <h3 className="text-3xl font-semibold text-slate-800 mt-1">
                  ₹{(totalAmount / 1000).toFixed(1)}K
                </h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <p className="text-sm text-slate-500">spent on supplies</p>
          </div>

          {/* Suppliers */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Suppliers</p>
                <h3 className="text-3xl font-semibold text-slate-800 mt-1">
                  {Object.keys(groupedBySupplier).length}
                </h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <p className="text-sm text-slate-500">active this month</p>
          </div>

        </div>


        {/* Supply Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-6">
              Record New Supply
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Supplier Name */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_name: e.target.value })
                  }
                  placeholder="Enter supplier name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg
                     focus:outline-none focus:border-slate-500
                     focus:ring-2 focus:ring-slate-400/20 transition"
                />
              </div>

              {/* Cloth Variety */}
              <div className="relative">
                <label className="block mb-1 text-sm font-medium text-slate-700">
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg
                     focus:outline-none focus:border-slate-500
                     focus:ring-2 focus:ring-slate-400/20 transition"
                />

                {showVarietyDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto
                          bg-white border border-slate-200 rounded-lg shadow-sm">
                    {filteredVarieties.length === 0 ? (
                      <div className="px-4 py-2 text-slate-500">
                        No varieties found
                      </div>
                    ) : (
                      filteredVarieties.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => handleVarietySelect(v)}
                          className="px-4 py-2 cursor-pointer
                             hover:bg-slate-100 transition"
                        >
                          <div className="font-medium text-slate-800">
                            {v.name}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">
                            {v.measurement_unit}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Quantity {selectedVariety && `(${selectedVariety.measurement_unit})`} *
                </label>
                <input
                  type="number"
                  min="1"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg
                     focus:outline-none focus:border-slate-500
                     focus:ring-2 focus:ring-slate-400/20 transition"
                />
              </div>

              {/* Price per Item */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg
                     focus:outline-none focus:border-slate-500
                     focus:ring-2 focus:ring-slate-400/20 transition"
                />
              </div>

              {/* Supply Date */}
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Supply Date *
                </label>
                <input
                  type="date"
                  value={formData.supply_date}
                  onChange={(e) =>
                    setFormData({ ...formData, supply_date: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg
                     focus:outline-none focus:border-slate-500
                     focus:ring-2 focus:ring-slate-400/20 transition"
                />
              </div>

              {/* Total Amount Preview */}
              {formData.quantity && formData.price_per_item && (
                <div className="md:col-span-2 p-4 bg-slate-100 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Total Amount
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.quantity} × ₹{formData.price_per_item}
                      </p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-800">
                      ₹{total.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 rounded-lg bg-slate-800 text-slate-100
                     font-medium hover:bg-slate-900 transition"
                >
                  Add Supply & Update Stock
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedVariety(null);
                    setVarietySearch('');
                  }}
                  className="px-6 py-3 rounded-lg border border-slate-300
                     text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Inventory List - Grouped by Supplier */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mx-auto"></div>
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
              const supplierQty = items.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

              return (
                <div key={supplier} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          {supplier}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {items.length} deliveries
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-slate-500">Total Amount</p>
                        <p className="text-2xl font-semibold text-slate-800">
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
                        {items.map((item, idx) => {
                          return (
                            <tr key={item.id} className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-indigo-50/30 transition`}>
                              <td className="px-4 py-3 text-slate-600">
                                {new Date(item.supply_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">
                                  {item.variety.name}
                                </div>
                                <div className="text-xs text-slate-500 capitalize">
                                  {item.variety.measurement_unit}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center font-medium text-slate-700">
                                {parseFloat(item.quantity).toFixed(1)}
                              </td>

                              <td className="px-4 py-3 text-right text-slate-700">
                                ₹{parseFloat(item.price_per_item).toFixed(2)}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                ₹{parseFloat(item.total_amount).toFixed(2)}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full
                     text-xs font-medium bg-blue-100 text-blue-700">
                                  {parseFloat(item.quantity_used).toFixed(1)}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full
                     text-xs font-medium bg-red-100 text-red-700">
                                  {parseFloat(item.quantity_returned || 0).toFixed(1)}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full
                     text-xs font-medium bg-green-100 text-green-700">
                                  {parseFloat(item.quantity_remaining).toFixed(1)}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-slate-400 hover:text-red-400 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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