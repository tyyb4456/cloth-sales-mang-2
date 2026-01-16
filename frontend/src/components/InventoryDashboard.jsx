import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function InventoryDashboard() {
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, lowStockRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/status`),
        fetch(`${API_BASE_URL}/inventory/low-stock`)
      ]);
      
      const statusData = await statusRes.json();
      const lowStockData = await lowStockRes.json();
      
      setInventoryStatus(Array.isArray(statusData) ? statusData : []);
      setLowStockItems(Array.isArray(lowStockData) ? lowStockData : []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStock = inventoryStatus.reduce((sum, item) => sum + parseFloat(item.current_stock), 0);
  const totalValue = inventoryStatus.reduce((sum, item) => {
    const supplied = parseFloat(item.total_supplied);
    return sum + supplied;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Inventory Dashboard</h2>
          <p className="text-gray-600 mt-1">Real-time stock levels and alerts</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Varieties</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">
                      {inventoryStatus.length}
                    </h3>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Package className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Stock</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">
                      {totalStock.toFixed(0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">
                      {lowStockItems.length}
                    </h3>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">
                      ₹{(totalValue / 1000).toFixed(0)}K
                    </h3>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Activity className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className="text-xl font-bold text-red-800">Low Stock Alerts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockItems.map((item) => (
                    <div key={item.variety_id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="font-semibold text-gray-800 mb-1">{item.variety_name}</div>
                      <div className="text-sm text-gray-600 mb-2 capitalize">{item.measurement_unit}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current:</span>
                        <span className="font-bold text-red-600">
                          {parseFloat(item.current_stock).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Minimum:</span>
                        <span className="font-medium text-gray-700">
                          {item.min_stock_level ? parseFloat(item.min_stock_level).toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Inventory */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">All Inventory</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Variety</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unit</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Current Stock</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Min Level</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Supplied</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Sold</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Returned</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-200">
                    {inventoryStatus.map((item, idx) => {
                      const stockPercentage = item.min_stock_level 
                        ? (parseFloat(item.current_stock) / parseFloat(item.min_stock_level)) * 100 
                        : 100;
                      
                      return (
                        <tr key={item.variety_id} className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{item.variety_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 capitalize">{item.measurement_unit}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                              item.is_low_stock 
                                ? 'bg-slate-100 text-slate-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {parseFloat(item.current_stock).toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">
                              {item.min_stock_level ? parseFloat(item.min_stock_level).toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp size={14} className="text-slate-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {parseFloat(item.total_supplied).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendingDown size={14} className="text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {parseFloat(item.total_sold).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendingDown size={14} className="text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {parseFloat(item.total_returned).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  item.is_low_stock ? 'bg-gray-600' : 'bg-gray-600'
                                }`}
                                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 block">
                              {item.is_low_stock ? 'Low Stock' : 'Good'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}