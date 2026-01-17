import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Calendar, Package, TrendingDown,
  CheckCircle, Clock, User, ArrowRightLeft, RotateCcw,
  AlertCircle, ChevronDown, ChevronUp, AlertTriangle, Search
} from 'lucide-react';
import api from '../api/api';  // ✅ Added

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ShopkeeperStockManagement = () => {
  const [varieties, setVarieties] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [issuedStock, setIssuedStock] = useState([]);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 🆕 NEW: Variety search states
  const [varietySearch, setVarietySearch] = useState('');
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [supplierInventories, setSupplierInventories] = useState([]);

  const [issueFormData, setIssueFormData] = useState({
    shopkeeper_name: '',
    shopkeeper_phone: '',
    variety_id: '',
    quantity_issued: '',
    issue_date: formatDate(new Date()),
    notes: '',
    deduct_from_inventory: true
  });

  const [returnFormData, setReturnFormData] = useState({
    quantity_returned: '',
    return_date: formatDate(new Date()),
    notes: ''
  });

  const [salesFormData, setSalesFormData] = useState({
    quantity_sold: '',
    sale_date: formatDate(new Date()),
    notes: ''
  });

  useEffect(() => {
    loadVarieties();
    loadIssuedStock();
  }, []);

  const loadVarieties = async () => {
    try {
      const response = await api.get('/varieties/');  // ✅ Changed
      const data = response.data;  // ✅ axios returns data
      setVarieties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadIssuedStock = async () => {
    setLoading(true);
    try {
      const response = await api.get('/shopkeeper-stock/');  // ✅ Changed
      const data = response.data;  // ✅ axios returns data
      setIssuedStock(Array.isArray(data) ? data : []);

      const uniqueShopkeepers = [...new Set(data.map(item => item.shopkeeper_name))];
      setShopkeepers(uniqueShopkeepers);
    } catch (error) {
      console.error('Error loading issued stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierInventories = async () => {
    try {
      const response = await api.get('/supplier/inventory');  // ✅ Changed
      const data = response.data;  // ✅ axios returns data
      setSupplierInventories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading supplier inventories:', error);
    }
  };

  // Call it in useEffect
  useEffect(() => {
    loadVarieties();
    loadIssuedStock();
    loadSupplierInventories(); // ✅ ADD THIS
  }, []);

  // Add this helper function to calculate real available stock
  const getAvailableStock = (varietyId) => {
    if (!varietyId) return 0;

    const total = supplierInventories
      .filter(inv => inv.variety_id === varietyId)
      .reduce((sum, inv) => sum + parseFloat(inv.quantity_remaining || 0), 0);

    return total;
  };

  // Update the handleVarietySelect function
  const handleVarietySelect = (variety) => {
    setSelectedVariety({
      ...variety,
      available_stock: getAvailableStock(variety.id) // ✅ Add calculated stock
    });
    setVarietySearch(variety.name);
    setIssueFormData({ ...issueFormData, variety_id: variety.id });
    setShowVarietyDropdown(false);
  };
  // 🆕 NEW: Filter varieties based on search
  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(varietySearch.toLowerCase())
  );

  const handleIssueStock = async (e) => {
    e.preventDefault();

    if (!issueFormData.shopkeeper_name || !issueFormData.variety_id || !issueFormData.quantity_issued) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const response = await api.post('/shopkeeper-stock/issue', {  // ✅ Changed
        ...issueFormData,
        variety_id: parseInt(issueFormData.variety_id),
        quantity_issued: parseFloat(issueFormData.quantity_issued)
      });

      alert('Stock issued successfully! Inventory deducted.');
      setShowIssueForm(false);
      setIssueFormData({
        shopkeeper_name: '',
        shopkeeper_phone: '',
        variety_id: '',
        quantity_issued: '',
        issue_date: formatDate(new Date()),
        notes: '',
        deduct_from_inventory: true
      });
      setSelectedVariety(null);
      setVarietySearch('');
      loadIssuedStock();
      loadVarieties(); // Reload to get updated stock levels
    } catch (error) {
      alert(error.response?.data?.detail || error.message || 'Failed to issue stock');  // ✅ Updated error handling
    }
  };

  const handleRecordSales = async (e) => {
    e.preventDefault();

    if (!salesFormData.quantity_sold || !selectedRecord) {
      alert('Please enter quantity sold');
      return;
    }

    try {
      const response = await api.post(`/shopkeeper-stock/${selectedRecord.id}/sales`, {  // ✅ Changed
        ...salesFormData,
        quantity_sold: parseFloat(salesFormData.quantity_sold)
      });

      alert('Sales recorded successfully!');
      setShowSalesForm(false);
      setSalesFormData({
        quantity_sold: '',
        sale_date: formatDate(new Date()),
        notes: ''
      });
      setSelectedRecord(null);
      loadIssuedStock();
    } catch (error) {
      alert(error.response?.data?.detail || error.message || 'Failed to record sales');  // ✅ Updated error handling
    }
  };

  const handleRecordReturn = async (e) => {
    e.preventDefault();

    if (!returnFormData.quantity_returned || !selectedRecord) {
      alert('Please enter quantity returned');
      return;
    }

    try {
      const response = await api.post(`/shopkeeper-stock/${selectedRecord.id}/return`, {  // ✅ Changed
        ...returnFormData,
        quantity_returned: parseFloat(returnFormData.quantity_returned)
      });

      alert('Return recorded successfully! Inventory restored.');
      setShowReturnForm(false);
      setReturnFormData({
        quantity_returned: '',
        return_date: formatDate(new Date()),
        notes: ''
      });
      setSelectedRecord(null);
      loadIssuedStock();
      loadVarieties(); // Reload to get updated stock levels
    } catch (error) {
      alert(error.response?.data?.detail || error.message || 'Failed to record return');  // ✅ Updated error handling
    }
  };

  const handleDelete = async (record) => {
    const hasSales = parseFloat(record.quantity_sold) > 0;
    const hasReturns = parseFloat(record.quantity_returned) > 0;

    let confirmMessage = `⚠️ Delete Stock Record?\n\n`;
    confirmMessage += `Shopkeeper: ${record.shopkeeper_name}\n`;
    confirmMessage += `Variety: ${record.variety.name}\n`;
    confirmMessage += `Issued: ${record.quantity_issued}\n`;

    if (hasSales || hasReturns) {
      confirmMessage += `\n⚠️ WARNING: This record has transactions:\n`;
      if (hasSales) confirmMessage += `• Sold: ${record.quantity_sold}\n`;
      if (hasReturns) confirmMessage += `• Returned: ${record.quantity_returned}\n`;
    }

    if (parseFloat(record.quantity_remaining) > 0) {
      confirmMessage += `\nRemaining stock (${record.quantity_remaining}) will be restored to inventory.`;
    }

    confirmMessage += `\n\nThis action cannot be undone. Continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await api.delete(`/shopkeeper-stock/${record.id}`);  // ✅ Changed

      alert('Record deleted successfully!\n\n' +
        (parseFloat(record.quantity_remaining) > 0
          ? `${record.quantity_remaining} units restored to inventory.`
          : 'No stock to restore.'));
      loadIssuedStock();
      loadVarieties(); // Reload to get updated stock levels
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);  // ✅ Updated error handling
    }
  };

  const getStatusBadge = (record) => {
    const remaining = parseFloat(record.quantity_remaining);

    if (remaining === 0) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completed</span>;
    } else if (parseFloat(record.quantity_sold) > 0 || parseFloat(record.quantity_returned) > 0) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Partial</span>;
    } else {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Active</span>;
    }
  };

  const filteredStock = selectedShopkeeper
    ? issuedStock.filter(item => item.shopkeeper_name === selectedShopkeeper)
    : issuedStock;

  const totalIssued = filteredStock.reduce((sum, item) => sum + parseFloat(item.quantity_issued), 0);
  const totalSold = filteredStock.reduce((sum, item) => sum + parseFloat(item.quantity_sold), 0);
  const totalReturned = filteredStock.reduce((sum, item) => sum + parseFloat(item.quantity_returned), 0);
  const totalRemaining = filteredStock.reduce((sum, item) => sum + parseFloat(item.quantity_remaining), 0);
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Shopkeeper Stock Management</h2>
            <p className="text-gray-600 mt-1">Track items issued to shopkeepers on consignment</p>
          </div>
          <button
            onClick={() => setShowIssueForm(!showIssueForm)}
            className="flex items-center px-5 py-2.5 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition"
          >
            <Plus size={18} className="mr-2" />
            Issue Stock
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total Issued</p>
            <p className="text-2xl font-bold text-gray-900">{totalIssued.toFixed(1)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Sold</p>
            <p className="text-2xl font-bold text-green-700">{totalSold.toFixed(1)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <RotateCcw className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Total Returned</p>
            <p className="text-2xl font-bold text-orange-700">{totalReturned.toFixed(1)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Still With Shopkeepers</p>
            <p className="text-2xl font-bold text-purple-700">{totalRemaining.toFixed(1)}</p>
          </div>
        </div>

        {/* Shopkeeper Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <User size={20} className="text-gray-600" />
            <select
              value={selectedShopkeeper || ''}
              onChange={(e) => setSelectedShopkeeper(e.target.value || null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="">All Shopkeepers</option>
              {shopkeepers.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Issue Stock Form */}
        {showIssueForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Issue Stock to Shopkeeper</h3>

            <form onSubmit={handleIssueStock}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Shopkeeper Name *</label>
                  <input
                    type="text"
                    value={issueFormData.shopkeeper_name}
                    onChange={(e) => setIssueFormData({ ...issueFormData, shopkeeper_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Phone (Optional)</label>
                  <input
                    type="text"
                    value={issueFormData.shopkeeper_phone}
                    onChange={(e) => setIssueFormData({ ...issueFormData, shopkeeper_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                  />
                </div>

                {/* 🆕 NEW: Searchable Variety Dropdown */}
                <div className="relative">
                  <label className="block mb-1 text-sm font-medium text-gray-700">Variety *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={varietySearch}
                      onChange={(e) => {
                        setVarietySearch(e.target.value);
                        setShowVarietyDropdown(true);
                      }}
                      onFocus={() => setShowVarietyDropdown(true)}
                      placeholder="Search variety..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                      required
                    />
                  </div>

                  {/* Dropdown */}
                  {showVarietyDropdown && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                      {filteredVarieties.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No varieties found</div>
                      ) : (
                        filteredVarieties.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleVarietySelect(v)}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition border-b border-gray-100 last:border-0"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{v.name}</div>
                                <div className="text-xs text-gray-500 capitalize mt-0.5">{v.measurement_unit}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold ${getAvailableStock(v.id) > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                  {getAvailableStock(v.id).toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">available</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 🆕 NEW: Stock Info Display */}
                {selectedVariety && (
                  <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${selectedVariety.available_stock > 0
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                    }`}>
                    <Package className={selectedVariety.available_stock > 0 ? 'text-green-600' : 'text-red-600'} size={24} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Available Stock</p>
                      <p className={`text-2xl font-bold ${selectedVariety.available_stock > 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {selectedVariety.available_stock.toFixed(1)} {selectedVariety.measurement_unit}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedVariety ? selectedVariety.available_stock : undefined} // ✅ Changed
                    value={issueFormData.quantity_issued}
                    onChange={(e) => setIssueFormData({ ...issueFormData, quantity_issued: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                    required
                  />
                  {selectedVariety && issueFormData.quantity_issued && parseFloat(issueFormData.quantity_issued) > selectedVariety.available_stock && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Exceeds available stock!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Issue Date *</label>
                  <input
                    type="date"
                    value={issueFormData.issue_date}
                    onChange={(e) => setIssueFormData({ ...issueFormData, issue_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                  <input
                    type="text"
                    value={issueFormData.notes}
                    onChange={(e) => setIssueFormData({ ...issueFormData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                    <input
                      type="checkbox"
                      checked={issueFormData.deduct_from_inventory}
                      onChange={(e) => setIssueFormData({ ...issueFormData, deduct_from_inventory: e.target.checked })}
                      className="w-5 h-5 text-gray-600 rounded focus:ring-gray-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Deduct from Inventory</p>
                      <div className="flex items-center gap-2 text-sm">
                        {issueFormData.deduct_from_inventory ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-gray-600">Stock will be deducted from current inventory</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-gray-600">Stock will NOT be deducted (for old/external stock)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                  >
                    Issue Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowIssueForm(false);
                      setSelectedVariety(null);
                      setVarietySearch('');
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Issued Stock Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">Issued Stock Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredStock.length} record{filteredStock.length !== 1 ? 's' : ''}
              {selectedShopkeeper && ` for ${selectedShopkeeper}`}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No stock issued yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredStock.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{record.shopkeeper_name}</h4>
                        {getStatusBadge(record)}
                        {record.deducted_from_inventory ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            ✓ New Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            Old Stock
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {record.variety.name} • Issued: {new Date(record.issue_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(record)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete record"
                      >
                        <Trash2 size={18} />
                      </button>

                      <button
                        onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        {expandedRecord === record.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600">Issued</p>
                      <p className="text-lg font-bold text-blue-700">{parseFloat(record.quantity_issued).toFixed(1)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Sold</p>
                      <p className="text-lg font-bold text-green-700">{parseFloat(record.quantity_sold).toFixed(1)}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-gray-600">Returned</p>
                      <p className="text-lg font-bold text-orange-700">{parseFloat(record.quantity_returned).toFixed(1)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">Remaining</p>
                      <p className="text-lg font-bold text-purple-700">{parseFloat(record.quantity_remaining).toFixed(1)}</p>
                    </div>
                  </div>

                  {expandedRecord === record.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                      {parseFloat(record.quantity_remaining) > 0 && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowSalesForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            <TrendingDown size={16} />
                            Record Return
                          </button>
                        </div>
                      )}

                      {(record.sales_transactions?.length > 0 || record.return_transactions?.length > 0) && (
                        <div className="space-y-3">
                          <h5 className="font-semibold text-gray-800">Transaction History</h5>

                          {record.sales_transactions?.map((tx, idx) => (
                            <div key={`sale-${idx}`} className="flex items-center gap-3 p-3 bg-white rounded border border-green-200">
                              <TrendingDown className="text-green-600" size={16} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Sold {tx.quantity_sold} units</p>
                                <p className="text-xs text-gray-500">{new Date(tx.sale_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}

                          {record.return_transactions?.map((tx, idx) => (
                            <div key={`return-${idx}`} className="flex items-center gap-3 p-3 bg-white rounded border border-orange-200">
                              <RotateCcw className="text-orange-600" size={16} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Returned {tx.quantity_returned} units</p>
                                <p className="text-xs text-gray-500">{new Date(tx.return_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Modal */}
        {showSalesForm && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Record Sales</h3>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Shopkeeper: <span className="font-medium text-gray-900">{selectedRecord.shopkeeper_name}</span></p>
                <p className="text-sm text-gray-600">Variety: <span className="font-medium text-gray-900">{selectedRecord.variety.name}</span></p>
                <p className="text-sm text-gray-600">Remaining: <span className="font-bold text-purple-600">{parseFloat(selectedRecord.quantity_remaining).toFixed(1)}</span></p>
              </div>

              <form onSubmit={handleRecordSales} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Quantity Sold *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedRecord.quantity_remaining}
                    value={salesFormData.quantity_sold}
                    onChange={(e) => setSalesFormData({ ...salesFormData, quantity_sold: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Sale Date *</label>
                  <input
                    type="date"
                    value={salesFormData.sale_date}
                    onChange={(e) => setSalesFormData({ ...salesFormData, sale_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={salesFormData.notes}
                    onChange={(e) => setSalesFormData({ ...salesFormData, notes: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Record Sales
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSalesForm(false);
                      setSelectedRecord(null);
                      setSalesFormData({ quantity_sold: '', sale_date: formatDate(new Date()), notes: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Return Modal */}
        {showReturnForm && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Record Return</h3>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Shopkeeper: <span className="font-medium text-gray-900">{selectedRecord.shopkeeper_name}</span></p>
                <p className="text-sm text-gray-600">Variety: <span className="font-medium text-gray-900">{selectedRecord.variety.name}</span></p>
                <p className="text-sm text-gray-600">Remaining: <span className="font-bold text-purple-600">{parseFloat(selectedRecord.quantity_remaining).toFixed(1)}</span></p>
              </div>

              <form onSubmit={handleRecordReturn} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Quantity Returned *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedRecord.quantity_remaining}
                    value={returnFormData.quantity_returned}
                    onChange={(e) => setReturnFormData({ ...returnFormData, quantity_returned: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Return Date *</label>
                  <input
                    type="date"
                    value={returnFormData.return_date}
                    onChange={(e) => setReturnFormData({ ...returnFormData, return_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={returnFormData.notes}
                    onChange={(e) => setReturnFormData({ ...returnFormData, notes: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    Record Return
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReturnForm(false);
                      setSelectedRecord(null);
                      setReturnFormData({ quantity_returned: '', return_date: formatDate(new Date()), notes: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopkeeperStockManagement;