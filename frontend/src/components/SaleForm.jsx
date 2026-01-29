// frontend/src/components/SaleForm.jsx - UPDATED WITH AUTO-CREATION FEATURE

import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SalesForm = ({
  show,
  onClose,
  onSubmit,
  varieties = [],
  supplierInventories = []
}) => {
  const { user } = useAuth(); // Get logged-in user

  const savedSalesperson = typeof window !== 'undefined' ? localStorage.getItem('lastSalesperson') || '' : '';
  const savedPaymentStatus = typeof window !== 'undefined' ? localStorage.getItem('lastPaymentStatus') || 'paid' : 'paid';

  const [formData, setFormData] = useState({
    salesperson_name: user?.full_name || savedSalesperson, // Use logged-in user's name
    variety_id: '',
    variety_name: '',
    quantity: '',
    selling_price: '',
    cost_price: '',
    sale_date: formatDate(new Date()),
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
  const [isNewVariety, setIsNewVariety] = useState(false);  // NEW: Track if creating new variety
  const [availablePriceOptions, setAvailablePriceOptions] = useState([]);
  const [showPriceSelector, setShowPriceSelector] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inlineError, setInlineError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityRef = useRef(null);
  const sellingPriceRef = useRef(null);
  const varietyInputRef = useRef(null);

  useEffect(() => {
    if (formData.salesperson_name) {
      localStorage.setItem('lastSalesperson', formData.salesperson_name);
    }
  }, [formData.salesperson_name]);


  useEffect(() => {
    localStorage.setItem('lastPaymentStatus', formData.payment_status);
  }, [formData.payment_status]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const resetForm = () => {
    setVarietySearch('');
    setSelectedVariety(null);
    setIsNewVariety(false);
    setFormData({
      salesperson_name: savedSalesperson,
      variety_id: '',
      variety_name: '',
      quantity: '',
      selling_price: '',
      cost_price: '',
      sale_date: formatDate(new Date()),
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
    setIsNewVariety(false);
    setFormData({
      ...formData,
      variety_id: variety.id,
      variety_name: variety.name,
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

    if (priceOptions.length === 1) {
      handlePriceOptionSelect(priceOptions[0]);
    } else if (priceOptions.length > 1) {
      setShowPriceSelector(true);
    }

    if (variety.default_cost_price && formData.quantity) {
      const cost = parseFloat(variety.default_cost_price) * parseFloat(formData.quantity);
      setFormData(prev => ({ ...prev, cost_price: cost.toString() }));
    }

    setTimeout(() => quantityRef.current?.focus(), 100);
  };

  // NEW: Handle creating new variety
  const handleCreateNewVariety = () => {
    const trimmedName = varietySearch.trim();

    if (!trimmedName) {
      setInlineError('Please enter a variety name');
      return;
    }

    setIsNewVariety(true);
    setSelectedVariety({
      id: null,
      name: trimmedName,
      measurement_unit: 'pieces'  // Default
    });
    setFormData({
      ...formData,
      variety_id: null,
      variety_name: trimmedName,
      cost_price: '',
      selected_inventory_id: null
    });
    setShowVarietyDropdown(false);
    setAvailablePriceOptions([]);

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

    if (formData.selected_inventory_id) {
      const selectedOption = availablePriceOptions.find(opt => opt.id === formData.selected_inventory_id);
      if (selectedOption && quantity) {
        const totalCost = selectedOption.price * parseFloat(quantity);
        setFormData(prev => ({ ...prev, quantity, cost_price: totalCost.toString() }));
      }
    } else if (selectedVariety?.default_cost_price && quantity) {
      const totalCost = parseFloat(selectedVariety.default_cost_price) * parseFloat(quantity);
      setFormData(prev => ({ ...prev, quantity, cost_price: totalCost.toString() }));
    }
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

  const isFormValid = () => {
    // Must have variety (existing or new name)
    if (!formData.variety_id && !formData.variety_name) {
      return false;
    }

    if (!formData.salesperson_name || !formData.quantity ||
      !formData.cost_price || !formData.selling_price) {
      return false;
    }

    if (formData.payment_status === 'loan' && !formData.customer_name.trim()) {
      return false;
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

    try {
      const payload = {
        salesperson_name: formData.salesperson_name,
        quantity: parseFloat(formData.quantity),
        selling_price: parseFloat(formData.selling_price),
        cost_price: parseFloat(formData.cost_price),
        sale_date: formData.sale_date,
        payment_status: formData.payment_status,
      };

      if (formData.variety_id) {
        payload.variety_id = parseInt(formData.variety_id);
      } else if (formData.variety_name) {
        payload.variety_name = formData.variety_name;
      }

      if (formData.payment_status === 'loan') {
        payload.customer_name = formData.customer_name;
      }

      if (formData.selected_inventory_id) {
        payload.supplier_inventory_id = formData.selected_inventory_id;
      }

      console.log('📤 Sending payload:', payload);

      const saleResponse = await api.post('/sales/', payload);
      const saleData = saleResponse.data;

      if (formData.payment_status === 'loan') {
        const loanPayload = {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          sale_id: saleData.id,
          total_loan_amount: parseFloat(formData.selling_price),
          due_date: formData.due_date || null,
          notes: formData.loan_notes || null
        };

        await api.post('/loans/', loanPayload);
      }

      setSuccessMessage(isNewVariety
        ? `Sale recorded! New variety "${formData.variety_name}" created automatically.`
        : 'Sale recorded successfully'
      );

      setTimeout(() => {
        resetForm();
        onSubmit();
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to record sale:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.detail
        || (Array.isArray(error.response?.data)
          ? error.response.data.map(e => e.msg).join(', ')
          : 'Failed to record sale');

      setInlineError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const prices = calculatePrices();
  const selectedPriceOption = availablePriceOptions.find(opt => opt.id === formData.selected_inventory_id);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl my-8">

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Sale</h3>
          <button
            onClick={resetForm}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-150"
          >
            <X size={20} />
          </button>
        </div>

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {inlineError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle size={16} />
            <span>{inlineError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          <div>
            <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Salesperson *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={user?.full_name || 'User'}
                    disabled
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (You)
                    </span>
                  </div>
                </div>
              </div>

{/* allow users to change the salesperson (for recording sales on behalf of others): */}

{/* <div>
  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
    Salesperson *
  </label>
  <input
    type="text"
    required
    value={formData.salesperson_name}
    onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
    placeholder="Enter salesperson name"
    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
  />
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    Default: {user?.full_name}
  </p>
</div> */}

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
                    setIsNewVariety(false);
                  }}
                  onFocus={() => setShowVarietyDropdown(true)}
                  onKeyDown={handleVarietyKeyDown}
                  placeholder="Type to search or create new..."
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors duration-150"
                />

                {showVarietyDropdown && (
                  <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    {filteredVarieties.length > 0 ? (
                      <>
                        {filteredVarieties.map((v, idx) => (
                          <div
                            key={v.id}
                            onClick={() => handleVarietySelect(v)}
                            className={`px-3 py-2.5 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0 transition-colors duration-150 ${idx === highlightedIndex
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

                        {varietySearch.trim() && (
                          <div
                            onClick={handleCreateNewVariety}
                            className="px-3 py-2.5 cursor-pointer bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-150"
                          >
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                              <Plus size={16} />
                              <span className="text-sm font-medium">Create "{varietySearch.trim()}"</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        onClick={handleCreateNewVariety}
                        className="px-3 py-2.5 cursor-pointer bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <Plus size={16} />
                          <span className="text-sm font-medium">Create new variety "{varietySearch.trim()}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show indicator for new variety */}
                {isNewVariety && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Plus size={12} />
                    <span>Creating new variety</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedVariety && (
            <>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Payment</h4>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${formData.payment_status === 'paid'
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

                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors duration-150 ${formData.payment_status === 'loan'
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
              {showPriceSelector && availablePriceOptions.length > 1 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Select Price Option</h4>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {availablePriceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handlePriceOptionSelect(option)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${formData.selected_inventory_id === option.id
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

              {selectedPriceOption && !showPriceSelector && (
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

              {/* Show info about auto-creation */}
              {isNewVariety && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Plus className="text-blue-600 dark:text-blue-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Creating New Variety
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        "{formData.variety_name}" will be created automatically with default settings.
                        You can update details in the Varieties page later.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isNewVariety && availablePriceOptions.length === 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                        No Inventory Found
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        This variety has no inventory records. A new inventory entry will be created automatically.
                        You can update supplier details in the Inventory page later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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