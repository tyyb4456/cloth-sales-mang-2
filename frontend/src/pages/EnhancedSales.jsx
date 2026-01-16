import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, AlertTriangle, PackageCheck, DollarSign } from 'lucide-react';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper function to get item count
const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function EnhancedSalesWithPriceSelector() {
  const [varieties, setVarieties] = useState([]);
  const [sales, setSales] = useState([]);
  const [supplierInventories, setSupplierInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const [formData, setFormData] = useState({
    salesperson_name: '',
    variety_id: '',
    quantity: '',
    selling_price: '',
    cost_price: '',
    sale_date: formatDate(new Date()),
    stock_type: 'old_stock',
    selected_inventory_id: null,

    // payment_status: 'paid',
    // customer_name: '',
    // customer_phone: '',
    // due_date: '',
    // loan_notes: ''
  });

  const [varietySearch, setVarietySearch] = useState('');
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [availablePriceOptions, setAvailablePriceOptions] = useState([]);
  const [showPriceSelector, setShowPriceSelector] = useState(false);

  const resetForm = () => {
    setVarietySearch('');
    setSelectedVariety(null);
    setFormData({
      salesperson_name: '',
      variety_id: '',
      quantity: '',
      selling_price: '',
      cost_price: '',
      sale_date: formatDate(new Date()),
      stock_type: 'old_stock',

      // payment_status: 'paid',
      // customer_name: '',
      // customer_phone: '',
      // due_date: '',
      // loan_notes: ''
    });
    setShowForm(false);
  };

  useEffect(() => {
    loadVarieties();
    loadSupplierInventories();
  }, []);

  useEffect(() => {
    loadSales();
  }, [selectedDate]);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/varieties/`);
      const data = await response.json();
      setVarieties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  // Helper functions
  const formatQuantityWithUnit = (quantity, unit) => {
    const qty = parseFloat(quantity);
    if (unit === 'meters') return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
    if (unit === 'yards') return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
    return Math.floor(qty);
  };

  const loadSupplierInventories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supplier/inventory`);
      const data = await response.json();
      setSupplierInventories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading supplier inventories:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/date/${selectedDate}`);
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVarietySelect = (variety) => {
    setFormData({
      ...formData,
      variety_id: variety.id,
      cost_price: '',
      selected_inventory_id: null
    });
    setVarietySearch(variety.name);
    setSelectedVariety(variety);
    setShowVarietyDropdown(false);

    // Find all price options for this variety from supplier inventory
    const priceOptions = supplierInventories
      .filter(inv =>
        inv.variety_id === variety.id &&
        parseFloat(inv.quantity_remaining) > 0
      )
      .map(inv => ({
        id: inv.id,
        supplier_name: inv.supplier_name,
        price: parseFloat(inv.price_per_item),
        quantity_remaining: parseFloat(inv.quantity_remaining),
        supply_date: inv.supply_date
      }))
      .sort((a, b) => new Date(b.supply_date) - new Date(a.supply_date));

    setAvailablePriceOptions(priceOptions);

    // If only one price option, auto-select it
    if (priceOptions.length === 1 && formData.stock_type === 'new_stock') {
      handlePriceOptionSelect(priceOptions[0]);
    } else if (priceOptions.length > 1 && formData.stock_type === 'new_stock') {
      setShowPriceSelector(true);
    }

    // Auto-fill from default price for old stock
    if (formData.stock_type === 'old_stock' && variety.default_cost_price && formData.quantity) {
      const cost = parseFloat(variety.default_cost_price) * parseFloat(formData.quantity);
      setFormData(prev => ({ ...prev, cost_price: cost.toString() }));
    }
  };

  const handlePriceOptionSelect = (option) => {
    const quantity = parseFloat(formData.quantity) || 1;
    const totalCost = option.price * quantity;

    setFormData(prev => ({
      ...prev,
      cost_price: totalCost.toString(),
      selected_inventory_id: option.id
    }));
    setShowPriceSelector(false);
  };

  const handleQuantityChange = (quantity) => {
    setFormData({ ...formData, quantity });

    if (formData.stock_type === 'new_stock' && formData.selected_inventory_id) {
      const selectedOption = availablePriceOptions.find(opt => opt.id === formData.selected_inventory_id);
      if (selectedOption && quantity) {
        const totalCost = selectedOption.price * parseFloat(quantity);
        setFormData(prev => ({ ...prev, quantity, cost_price: totalCost.toString() }));
      }
    } else if (formData.stock_type === 'old_stock' && selectedVariety?.default_cost_price && quantity) {
      const totalCost = parseFloat(selectedVariety.default_cost_price) * parseFloat(quantity);
      setFormData(prev => ({ ...prev, quantity, cost_price: totalCost.toString() }));
    }
  };

  const handleStockTypeChange = (stockType) => {
    setFormData({
      ...formData,
      stock_type: stockType,
      cost_price: '',
      selected_inventory_id: null
    });

    if (stockType === 'new_stock' && availablePriceOptions.length > 1) {
      setShowPriceSelector(true);
    } else if (stockType === 'new_stock' && availablePriceOptions.length === 1) {
      handlePriceOptionSelect(availablePriceOptions[0]);
    } else if (stockType === 'old_stock' && selectedVariety?.default_cost_price && formData.quantity) {
      const cost = parseFloat(selectedVariety.default_cost_price) * parseFloat(formData.quantity);
      setFormData(prev => ({ ...prev, cost_price: cost.toString() }));
    }
  };

  const getCurrentStock = () => {
    if (!selectedVariety) return 0;
    return availablePriceOptions.reduce((sum, opt) => sum + opt.quantity_remaining, 0);
  };

  const calculatePrices = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const totalCost = parseFloat(formData.cost_price) || 0;
    const totalSelling = parseFloat(formData.selling_price) || 0;

    if (qty === 0) return { costPerUnit: 0, sellingPerUnit: 0, totalProfit: 0, profitPerUnit: 0 };

    const costPerUnit = totalCost / qty;
    const sellingPerUnit = totalSelling / qty;
    const profitPerUnit = sellingPerUnit - costPerUnit;
    const totalProfit = totalSelling - totalCost;

    return { costPerUnit, sellingPerUnit, totalProfit, profitPerUnit };
  };

  const prices = calculatePrices();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🆕 Validate customer info if loan
    if (formData.payment_status === 'loan') {
      if (!formData.customer_name.trim()) {
        alert('Please enter customer name for loan sale');
        return;
      }
    }

    if (formData.stock_type === 'new_stock') {
      const currentStock = getCurrentStock();
      if (currentStock < parseFloat(formData.quantity)) {
        alert(`Insufficient stock! Available: ${currentStock}, Required: ${formData.quantity}`);
        return;
      }
    }

    try {
      const payload = {
        salesperson_name: formData.salesperson_name,
        variety_id: parseInt(formData.variety_id),
        quantity: parseFloat(formData.quantity),
        selling_price: parseFloat(formData.selling_price),
        cost_price: parseFloat(formData.cost_price),
        sale_date: formData.sale_date,
        stock_type: formData.stock_type,

    
        // payment_status: formData.payment_status,
        // customer_name: formData.payment_status === 'loan' ? formData.customer_name : null
      };

      if (formData.stock_type === 'new_stock' && formData.selected_inventory_id) {
        payload.supplier_inventory_id = formData.selected_inventory_id;
      }

      const saleResponse = await fetch(`${API_BASE_URL}/sales/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saleResponse.ok) {
        const error = await saleResponse.json();
        throw new Error(error.detail || 'Failed to record sale');
      }

      // const saleData = await saleResponse.json();

      // 🆕 NEW: If loan, create loan record
      // if (formData.payment_status === 'loan') {
      //   const loanPayload = {
      //     customer_name: formData.customer_name,
      //     customer_phone: formData.customer_phone || null,
      //     sale_id: saleData.id,
      //     total_loan_amount: parseFloat(formData.selling_price),
      //     due_date: formData.due_date || null,
      //     notes: formData.loan_notes || null
      //   };

      //   const loanResponse = await fetch(`${API_BASE_URL}/loans/`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(loanPayload)
      //   });

      //   if (!loanResponse.ok) {
      //     console.error('Failed to create loan record');
      //   }
      // }

      alert('Sale recorded successfully!');
      resetForm();
      loadSales();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sale?')) return;

    try {
      await fetch(`${API_BASE_URL}/sales/${id}`, { method: 'DELETE' });
      loadSales();
      loadSupplierInventories();
      alert('Sale deleted!');
    } catch (error) {
      alert('Failed to delete sale');
    }
  };

  const totalSales = sales.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.quantity), 0);
  const totalProfit = sales.reduce((sum, item) => sum + parseFloat(item.profit), 0);
  const totalItemsSold = sales.reduce((sum, item) => {
    return sum + getItemCount(item.quantity, item.variety.measurement_unit);
  }, 0);

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const currentStock = getCurrentStock();
  const selectedPriceOption = availablePriceOptions.find(opt => opt.id === formData.selected_inventory_id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Sales Management</h2>
            <p className="text-gray-600 mt-1">Record sales with flexible price selection</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-gray-800 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center px-5 py-2.5 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition"
            >
              <Plus size={18} className="mr-2" />
              Record Sale
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">New Sale</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Salesperson *</label>
                <select
                  value={formData.salesperson_name}
                  onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select Salesperson</option>
                  <option value="shahzad">shahzad</option>
                  <option value="zulifqar">zulifqar</option>
                  <option value="kashif">kashif</option>
                </select>
              </div>

              <div className="relative">
                <label className="block mb-1 text-sm font-medium text-gray-700">Cloth Variety *</label>
                <input
                  type="text"
                  value={varietySearch}
                  onChange={(e) => {
                    setVarietySearch(e.target.value);
                    setShowVarietyDropdown(true);
                  }}
                  onFocus={() => setShowVarietyDropdown(true)}
                  placeholder="Search variety..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                {showVarietyDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filteredVarieties.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => handleVarietySelect(v)}
                        className="px-4 py-2 cursor-pointer hover:bg-blue-50 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{v.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{v.measurement_unit}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-700">Stock Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="stock_type"
                      value="old_stock"
                      checked={formData.stock_type === 'old_stock'}
                      onChange={(e) => handleStockTypeChange(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 font-medium">Old Stock (No Deduction)</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="stock_type"
                      value="new_stock"
                      checked={formData.stock_type === 'new_stock'}
                      onChange={(e) => handleStockTypeChange(e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-gray-700 font-medium">New Stock (Auto Deduct)</span>
                  </label>
                </div>
              </div>

              {/* Payment Status - ADD THIS SECTION */}
              {/* <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-700">Payment Status *</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="payment_status"
                      value="paid"
                      checked={formData.payment_status === 'paid'}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      className="w-4 h-4 text-gray-600"
                    />
                    <span className="ml-2 text-gray-700 font-medium">Paid</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="payment_status"
                      value="loan"
                      checked={formData.payment_status === 'loan'}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="ml-2 text-gray-700 font-medium">Customer Loan</span>
                  </label>
                </div>
              </div> */}

              {/* Customer Info - ONLY SHOW IF LOAN */}
              {/* {formData.payment_status === 'loan' && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Customer Name *</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Customer Phone (Optional)</label>
                    <input
                      type="text"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Due Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.loan_notes}
                      onChange={(e) => setFormData({ ...formData, loan_notes: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any notes about this loan..."
                    />
                  </div>
                </>
              )} */}

              {/* 🆕 NEW: Price Selector for Multiple Price Options */}
              {showPriceSelector && availablePriceOptions.length > 1 && (
                <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={20} className="text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Select Price Option</h4>
                  </div>
                  <div className="space-y-2">
                    {availablePriceOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handlePriceOptionSelect(option)}
                        className={`w-full p-3 rounded-lg border-2 transition text-left ${formData.selected_inventory_id === option.id
                          ? 'border-gray-600 bg-gray-100'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-800">
                              ₹{option.price.toFixed(2)} per unit
                            </div>
                            <div className="text-sm text-gray-600">
                              Supplier: {option.supplier_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Date: {new Date(option.supply_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              {option.quantity_remaining.toFixed(1)} available
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show selected price info */}
              {selectedPriceOption && !showPriceSelector && (
                <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Selected Price</p>
                      <p className="text-xs text-green-600">
                        ₹{selectedPriceOption.price.toFixed(2)}/unit from {selectedPriceOption.supplier_name}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPriceSelector(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {formData.stock_type === 'new_stock' && selectedVariety && (
                <div className={`md:col-span-2 p-3 rounded-lg border ${currentStock > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <PackageCheck size={18} className={currentStock > 0 ? 'text-green-600' : 'text-red-600'} />
                    <span className={`font-medium ${currentStock > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Total Available Stock: {currentStock.toFixed(1)} {selectedVariety.measurement_unit}
                    </span>
                  </div>
                  {formData.quantity && parseFloat(formData.quantity) > currentStock && (
                    <div className="mt-2 flex items-center gap-2 text-red-700">
                      <AlertTriangle size={16} />
                      <span className="text-sm">Insufficient stock!</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Quantity {selectedVariety && `(${selectedVariety.measurement_unit})`} *
                </label>
                <input
                  type="number"
                  min="1"
                  step={selectedVariety?.measurement_unit !== 'pieces' ? '0.01' : '1'}
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Sale Date *</label>
                <input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Total Cost Price (₹) *
                  {(formData.stock_type === 'new_stock' || selectedVariety?.default_cost_price) && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      (Auto-filled)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Will auto-fill..."
                />
                {formData.quantity && formData.cost_price && (
                  <p className="text-xs text-gray-500 mt-1">
                    Per unit: ₹{prices.costPerUnit.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Total Selling Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {formData.quantity && formData.selling_price && (
                  <p className="text-xs text-gray-500 mt-1">
                    Per unit: ₹{prices.sellingPerUnit.toFixed(2)}
                  </p>
                )}
              </div>

              {formData.quantity && formData.cost_price && formData.selling_price && (
                <div className="md:col-span-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Profit:</p>
                      <p className="text-2xl font-bold text-green-700">₹{prices.totalProfit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Profit Per Unit:</p>
                      <p className="text-2xl font-bold text-green-700">₹{prices.profitPerUnit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 rounded-lg bg-slate-600 text-white font-medium hover:bg-slate-700 transition"
                >
                  Record Sale
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedVariety(null);
                    setShowPriceSelector(false);
                  }}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No sales for this date</div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 text-gray-600 text-sm">
                    <tr>
                      <th className="px-4 py-3 text-left">Salesperson</th>
                      <th className="px-4 py-3 text-left">Variety</th>
                      <th className="px-4 py-3 text-center">Stock Type</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Cost/Unit</th>
                      <th className="px-4 py-3 text-right">Price/Unit</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-right">Total Sale</th>
                      <th className="px-4 py-3 text-center">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sales.map((item, idx) => (
                      <tr key={item.id} className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition`}>
                        <td className="px-4 py-3 font-medium">{item.salesperson_name}</td>
                        <td className="px-4 py-3">
                          <div>{item.variety.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{item.variety.measurement_unit}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.stock_type === 'new_stock'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {item.stock_type === 'new_stock' ? '✓ New' : 'Old'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-medium">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(item.cost_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(item.selling_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                          {new Date(item.sale_timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-gray-800">{totalItemsSold}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-800">₹{totalSales.toFixed(2)}</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}