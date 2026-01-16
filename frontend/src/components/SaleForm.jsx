import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SalesForm = ({ 
  show, 
  onClose, 
  onSubmit, 
  varieties = [], 
  supplierInventories = [],
  API_BASE_URL 
}) => {
  // Load saved preferences
  const savedSalesperson = typeof window !== 'undefined' ? localStorage.getItem('lastSalesperson') || '' : '';
  const savedStockType = typeof window !== 'undefined' ? localStorage.getItem('lastStockType') || 'old_stock' : 'old_stock';
  const savedPaymentStatus = typeof window !== 'undefined' ? localStorage.getItem('lastPaymentStatus') || 'paid' : 'paid';

  const [formData, setFormData] = useState({
    salesperson_name: savedSalesperson,
    variety_id: '',
    quantity: '',
    selling_price: '',
    cost_price: '',
    sale_date: formatDate(new Date()),
    stock_type: savedStockType,
    selected_inventory_id: null,
    payment_status: savedPaymentStatus,
    customer_name: '',
    customer_phone: '',
    due_date: '',
    loan_notes: ''
  });

  const [varietySearch, setVarietySearch] = useState('');
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [availablePriceOptions, setAvailablePriceOptions] = useState([]);
  const [showPriceSelector, setShowPriceSelector] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inlineError, setInlineError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for auto-focus
  const quantityRef = useRef(null);
  const sellingPriceRef = useRef(null);
  const varietyInputRef = useRef(null);

  // Save preferences
  useEffect(() => {
    if (formData.salesperson_name) {
      localStorage.setItem('lastSalesperson', formData.salesperson_name);
    }
  }, [formData.salesperson_name]);

  useEffect(() => {
    localStorage.setItem('lastStockType', formData.stock_type);
  }, [formData.stock_type]);

  useEffect(() => {
    localStorage.setItem('lastPaymentStatus', formData.payment_status);
  }, [formData.payment_status]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const resetForm = () => {
    setVarietySearch('');
    setSelectedVariety(null);
    setFormData({
      salesperson_name: savedSalesperson,
      variety_id: '',
      quantity: '',
      selling_price: '',
      cost_price: '',
      sale_date: formatDate(new Date()),
      stock_type: savedStockType,
      payment_status: savedPaymentStatus,
      selected_inventory_id: null,
      customer_name: '',
      customer_phone: '',
      due_date: '',
      loan_notes: ''
    });
    setAvailablePriceOptions([]);
    setShowPriceSelector(false);
    setInlineError('');
    setSuccessMessage('');
    onClose();
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

    if (priceOptions.length === 1 && formData.stock_type === 'new_stock') {
      handlePriceOptionSelect(priceOptions[0]);
    } else if (priceOptions.length > 1 && formData.stock_type === 'new_stock') {
      setShowPriceSelector(true);
    }

    if (formData.stock_type === 'old_stock' && variety.default_cost_price && formData.quantity) {
      const cost = parseFloat(variety.default_cost_price) * parseFloat(formData.quantity);
      setFormData(prev => ({ ...prev, cost_price: cost.toString() }));
    }

    // Auto-focus quantity after variety selected
    setTimeout(() => quantityRef.current?.focus(), 100);
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
    setInlineError('');

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

    const costPerUnit = Math.round((totalCost / qty) * 100) / 100;
    const sellingPerUnit = Math.round((totalSelling / qty) * 100) / 100;
    const profitPerUnit = Math.round((sellingPerUnit - costPerUnit) * 100) / 100;
    const totalProfit = Math.round((totalSelling - totalCost) * 100) / 100;

    return { costPerUnit, sellingPerUnit, totalProfit, profitPerUnit };
  };

  // Keyboard navigation for variety dropdown
  const handleVarietyKeyDown = (e) => {
    if (!showVarietyDropdown || filteredVarieties.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < filteredVarieties.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVarieties[highlightedIndex]) {
        handleVarietySelect(filteredVarieties[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowVarietyDropdown(false);
    }
  };

  // Validate form
  const isFormValid = () => {
    if (!formData.salesperson_name || !formData.variety_id || !formData.quantity || 
        !formData.cost_price || !formData.selling_price) {
      return false;
    }

    if (formData.payment_status === 'loan' && !formData.customer_name.trim()) {
      return false;
    }

    if (formData.stock_type === 'new_stock') {
      const currentStock = getCurrentStock();
      if (currentStock < parseFloat(formData.quantity)) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setIsSubmitting(true);

    if (formData.payment_status === 'loan' && !formData.customer_name.trim()) {
      setInlineError('Customer name is required for loan sales');
      setIsSubmitting(false);
      return;
    }

    if (formData.stock_type === 'new_stock') {
      const currentStock = getCurrentStock();
      if (currentStock < parseFloat(formData.quantity)) {
        setInlineError(`Insufficient stock. Only ${currentStock} available.`);
        setIsSubmitting(false);
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
        payment_status: formData.payment_status,
        customer_name: formData.payment_status === 'loan' ? formData.customer_name : null
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

      const saleData = await saleResponse.json();

      if (formData.payment_status === 'loan') {
        const loanPayload = {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          sale_id: saleData.id,
          total_loan_amount: parseFloat(formData.selling_price),
          due_date: formData.due_date || null,
          notes: formData.loan_notes || null
        };

        await fetch(`${API_BASE_URL}/loans/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loanPayload)
        });
      }

      setSuccessMessage('Sale recorded successfully');
      setTimeout(() => {
        resetForm();
        onSubmit();
      }, 1000);
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const prices = calculatePrices();
  const currentStock = getCurrentStock();
  const selectedPriceOption = availablePriceOptions.find(opt => opt.id === formData.selected_inventory_id);
  const maxQuantity = formData.stock_type === 'new_stock' ? currentStock : undefined;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Sale</h3>
          <button 
            onClick={resetForm} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-150"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {inlineError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle size={16} />
            <span>{inlineError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Basic Information */}
          <div>
            <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Salesperson *
                </label>
                <select
                  required
                  value={formData.salesperson_name}
                  onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                >
                  <option value="">Select</option>
                  <option value="shahzad">Shahzad</option>
                  <option value="zulifqar">Zulifqar</option>
                  <option value="kashif">Kashif</option>
                </select>
              </div>

              <div className="relative">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Cloth Variety *
                </label>
                <input
                  ref={varietyInputRef}
                  required
                  type="text"
                  value={varietySearch}
                  onChange={(e) => {
                    setVarietySearch(e.target.value);
                    setShowVarietyDropdown(true);
                    setHighlightedIndex(0);
                  }}
                  onFocus={() => setShowVarietyDropdown(true)}
                  onKeyDown={handleVarietyKeyDown}
                  placeholder="Search variety..."
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                />

                {showVarietyDropdown && filteredVarieties.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    {filteredVarieties.map((v, idx) => (
                      <div
                        key={v.id}
                        onClick={() => handleVarietySelect(v)}
                        className={`px-3 py-2.5 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0 transition-colors duration-150 ${
                          idx === highlightedIndex
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{v.name}</div>
                          {v.current_stock > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {parseFloat(v.current_stock).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Only show after variety selected */}
          {selectedVariety && (
            <>
              {/* Stock & Payment Type */}
              <div>
                <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Sale Type</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      Stock Type *
                    </label>
                    <div className="flex gap-2">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${
                        formData.stock_type === 'old_stock'
                          ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="stock_type"
                          value="old_stock"
                          checked={formData.stock_type === 'old_stock'}
                          onChange={(e) => handleStockTypeChange(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>Old</span>
                      </label>

                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${
                        formData.stock_type === 'new_stock'
                          ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="stock_type"
                          value="new_stock"
                          checked={formData.stock_type === 'new_stock'}
                          onChange={(e) => handleStockTypeChange(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>New</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      Payment *
                    </label>
                    <div className="flex gap-2">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${
                        formData.payment_status === 'paid'
                          ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="payment_status"
                          value="paid"
                          checked={formData.payment_status === 'paid'}
                          onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                          className="w-4 h-4"
                        />
                        <span>Paid</span>
                      </label>

                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${
                        formData.payment_status === 'loan'
                          ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="payment_status"
                          value="loan"
                          checked={formData.payment_status === 'loan'}
                          onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                          className="w-4 h-4"
                        />
                        <span>Loan</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info - Progressive Disclosure */}
              {formData.payment_status === 'loan' && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                        placeholder="Customer name"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                        placeholder="03XX-XXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={formData.loan_notes}
                        onChange={(e) => setFormData({ ...formData, loan_notes: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                        placeholder="Optional notes..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Price Selector - Progressive Disclosure */}
              {showPriceSelector && availablePriceOptions.length > 1 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Select Price Option</h4>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {availablePriceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handlePriceOptionSelect(option)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${
                          formData.selected_inventory_id === option.id
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              ₹{option.price.toFixed(2)} <span className="text-xs text-gray-500 dark:text-gray-400">per unit</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {option.supplier_name}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {option.quantity_remaining.toFixed(1)} available
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Price Display */}
              {selectedPriceOption && !showPriceSelector && formData.stock_type === 'new_stock' && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">₹{selectedPriceOption.price.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      from {selectedPriceOption.supplier_name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPriceSelector(true)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline transition-colors duration-150"
                  >
                    Change
                  </button>
                </div>
              )}

{/* Stock Alert */}
              {formData.stock_type === 'new_stock' && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Available: <span className="font-medium">{currentStock.toFixed(1)}</span> {selectedVariety.measurement_unit}
                  </span>
                  {formData.quantity && parseFloat(formData.quantity) > currentStock && (
                    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle size={14} />
                      <span>Insufficient stock</span>
                    </div>
                  )}
                </div>
              )}

              {/* Sale Details */}
              <div>
                <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Sale Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Quantity ({selectedVariety.measurement_unit}) *
                    </label>
                    <input
                      ref={quantityRef}
                      required
                      type="number"
                      min="0.01"
                      max={maxQuantity}
                      step="any"
                      value={formData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      onBlur={() => {
                        if (formData.quantity && !formData.selling_price) {
                          setTimeout(() => sellingPriceRef.current?.focus(), 100);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                      placeholder="0"
                    />
                    {maxQuantity && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Max: {maxQuantity.toFixed(1)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Sale Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Cost Price (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                      placeholder="0.00"
                    />
                    {formData.quantity && formData.cost_price && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Per unit: ₹{prices.costPerUnit.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Selling Price (₹) *
                    </label>
                    <input
                      ref={sellingPriceRef}
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                      placeholder="0.00"
                    />
                    {formData.quantity && formData.selling_price && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Per unit: ₹{prices.sellingPerUnit.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Profit Display - Progressive Disclosure */}
              {formData.quantity && formData.cost_price && formData.selling_price && (
                <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Profit</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        ₹{prices.totalProfit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Per Unit</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        ₹{prices.profitPerUnit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Sale'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesForm;