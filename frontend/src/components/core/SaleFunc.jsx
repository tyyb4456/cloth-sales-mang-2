// FULL EDIT MODAL - Edit ALL fields
export function EditSaleModal({ sale, onClose, onSave, varieties }) {
  const [formData, setFormData] = useState({
    salesperson_name: sale.salesperson_name || '',
    variety_id: sale.variety_id || '',
    quantity: sale.quantity || '',
    selling_price: sale.selling_price || '',
    cost_price: sale.cost_price || '',
    payment_status: sale.payment_status || 'paid',
    customer_name: sale.customer_name || '',
    sale_date: formatDate(sale.sale_date)
  });
  
  const [loading, setLoading] = useState(false);

  const selectedVariety = varieties.find(v => v.id === parseInt(formData.variety_id));

  const formatQuantityWithUnit = (quantity, unit) => {
    const qty = parseFloat(quantity);
    if (unit === 'meters') return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
    if (unit === 'yards') return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
    return Math.floor(qty);
  };

  const calculateProfit = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.cost_price) || 0;
    const selling = parseFloat(formData.selling_price) || 0;
    const totalCost = cost * qty;
    const totalSelling = selling * qty;
    return (totalSelling - totalCost).toFixed(2);
  };

  const handleSave = async () => {
    if (!formData.salesperson_name || !formData.variety_id || !formData.quantity || !formData.selling_price) {
      alert('Please fill all required fields');
      return;
    }

    if (formData.payment_status === 'loan' && !formData.customer_name.trim()) {
      alert('Customer name is required for loan sales');
      return;
    }

    setLoading(true);
    try {
      const quantity = parseFloat(formData.quantity);
      const costPerUnit = parseFloat(formData.cost_price) || 0;
      const sellingPerUnit = parseFloat(formData.selling_price);
      
      const totalCost = costPerUnit * quantity;
      const totalSelling = sellingPerUnit * quantity;
      const totalProfit = totalSelling - totalCost;

      await api.put(`/sales/${sale.id}`, {
        salesperson_name: formData.salesperson_name,
        variety_id: parseInt(formData.variety_id),
        quantity: quantity,
        selling_price: sellingPerUnit,
        cost_price: costPerUnit,
        profit: totalProfit,
        payment_status: formData.payment_status,
        customer_name: formData.payment_status === 'loan' ? formData.customer_name : null,
        sale_date: formData.sale_date
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update sale:', error);
      alert(error.response?.data?.detail || 'Failed to update sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Sale</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Salesperson Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Salesperson Name *
            </label>
            <input
              type="text"
              value={formData.salesperson_name}
              onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Enter salesperson name"
            />
          </div>

          {/* Variety */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cloth Variety *
            </label>
            <select
              value={formData.variety_id}
              onChange={(e) => setFormData({ ...formData, variety_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select variety</option>
              {varieties.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.measurement_unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity ({selectedVariety?.measurement_unit || 'units'}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cost Price per Unit (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selling Price per Unit (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Status *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="payment_status"
                  value="paid"
                  checked={formData.payment_status === 'paid'}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Paid</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="payment_status"
                  value="loan"
                  checked={formData.payment_status === 'loan'}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Loan</span>
              </label>
            </div>
          </div>

          {/* Customer Name (for loans) */}
          {formData.payment_status === 'loan' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Enter customer name"
              />
            </div>
          )}

          {/* Sale Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sale Date *
            </label>
            <input
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Profit Preview */}
          <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Profit</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  ₹{calculateProfit()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Cost</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ₹{((parseFloat(formData.cost_price) || 0) * (parseFloat(formData.quantity) || 0)).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Total Selling</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ₹{((parseFloat(formData.selling_price) || 0) * (parseFloat(formData.quantity) || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}