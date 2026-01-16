// frontend/src/pages/Reports.jsx - FIXED WITH AUTHENTICATION

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, Users, Award, ShoppingCart } from 'lucide-react';
import api from '../api/api'; // ✅ USING AUTHENTICATED API

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

export default function Reports() {
  const [viewMode, setViewMode] = useState('daily');
  const [date, setDate] = useState(formatDate(new Date()));

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const [dailyReport, setDailyReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [rangeReport, setRangeReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const [salesData, setSalesData] = useState([]);
  const [varietyMap, setVarietyMap] = useState({});

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailyReports();
    } else {
      loadRangeReport();
    }
  }, [date, startDate, endDate, viewMode]);

  const loadDailyReports = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Using authenticated API
      const [dailyRes, profitRes, salesRes, varietiesRes] = await Promise.all([
        api.get(`/reports/daily/${date}`),
        api.get(`/reports/profit/${date}`),
        api.get(`/sales/date/${date}`),
        api.get('/varieties/')
      ]);

      const varietyMapTemp = {};
      varietiesRes.data.forEach(v => {
        varietyMapTemp[v.id] = v;
      });

      const correctItemCount = salesRes.data.reduce((sum, sale) => {
        const variety = varietyMapTemp[sale.variety_id];
        return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
      }, 0);

      dailyRes.data.sales_summary.total_quantity_sold = correctItemCount;

      setDailyReport(dailyRes.data);
      setProfitReport(profitRes.data);
      setSalesData(salesRes.data);
      setVarietyMap(varietyMapTemp);
    } catch (error) {
      console.error('Error loading reports:', error);
      setDailyReport(null);
      setProfitReport(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRangeReport = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Using authenticated API
      const [allSales, varieties] = await Promise.all([
        api.get('/sales/'),
        api.get('/varieties/')
      ]);

      const varietyMap = {};
      varieties.data.forEach(v => {
        varietyMap[v.id] = v;
      });

      const filteredSales = allSales.data.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
      });

      const totalRevenue = filteredSales.reduce((sum, sale) =>
        sum + (parseFloat(sale.selling_price) * sale.quantity), 0
      );

      const totalProfit = filteredSales.reduce((sum, sale) =>
        sum + parseFloat(sale.profit), 0
      );

      const totalItemsSold = filteredSales.reduce((sum, sale) => {
        const variety = varietyMap[sale.variety_id];
        return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
      }, 0);

      const productStats = filteredSales.reduce((acc, sale) => {
        const variety = varietyMap[sale.variety_id];
        const varietyName = variety?.name || `Product ${sale.variety_id}`;

        if (!acc[varietyName]) {
          acc[varietyName] = {
            name: varietyName,
            revenue: 0,
            profit: 0,
            quantity: 0,
            measurement_unit: variety?.measurement_unit || 'pieces'
          };
        }

        acc[varietyName].revenue += parseFloat(sale.selling_price) * sale.quantity;
        acc[varietyName].profit += parseFloat(sale.profit);
        acc[varietyName].quantity += getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
        return acc;
      }, {});

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const dailyBreakdown = filteredSales.reduce((acc, sale) => {
        const date = sale.sale_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            revenue: 0,
            profit: 0,
            transactions: 0
          };
        }
        acc[date].revenue += parseFloat(sale.selling_price) * sale.quantity;
        acc[date].profit += parseFloat(sale.profit);
        acc[date].transactions += 1;
        return acc;
      }, {});

      const dailyData = Object.values(dailyBreakdown)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setRangeReport({
        summary: {
          totalRevenue,
          totalProfit,
          totalItemsSold,
          transactionCount: filteredSales.length,
          avgTransactionValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        },
        topProducts,
        dailyData
      });

    } catch (error) {
      console.error('Error loading range report:', error);
      setRangeReport(null);
    } finally {
      setLoading(false);
    }
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setViewMode('range');
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setViewMode('range');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Sales Reports</h2>
          <p className="text-sm text-gray-600 mt-1">View daily or range-based sales performance</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'daily' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('range')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'range' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Range
            </button>
          </div>

          {viewMode === 'range' && (
            <div className="flex gap-2">
              <button
                onClick={setLast30Days}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-medium text-sm shadow-sm active:scale-95"
              >
                Last 30 Days
              </button>
              <button
                onClick={setThisMonth}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                This Month
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-600" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 transition"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-50">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 transition"
              />
            </div>
            <div className="flex-1 min-w-50">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 transition"
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'daily' && dailyReport && dailyReport.sales_summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-4 hover:shadow-md transition rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
                <TrendingUp size={20} className="text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{parseFloat(dailyReport.sales_summary.total_sales_amount).toFixed(2)}
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>Items Sold: {dailyReport.sales_summary.total_quantity_sold}</div>
                <div>Transactions: {dailyReport.sales_summary.sales_count}</div>
              </div>
            </div>

            <div className="card p-4 hover:shadow-md transition rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Profit</h3>
                <DollarSign size={20} className="text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-teal-700">
                ₹{parseFloat(dailyReport.sales_summary.total_profit).toFixed(2)}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Profit Margin:{' '}
                {dailyReport.sales_summary.total_sales_amount > 0
                  ? ((parseFloat(dailyReport.sales_summary.total_profit) / parseFloat(dailyReport.sales_summary.total_sales_amount)) * 100).toFixed(1)
                  : '0'}%
              </div>
            </div>

            <div className="card p-4 hover:shadow-md transition rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Average Sale</h3>
                <ShoppingCart size={20} className="text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{dailyReport.sales_summary.sales_count > 0
                  ? (parseFloat(dailyReport.sales_summary.total_sales_amount) / dailyReport.sales_summary.sales_count).toFixed(2)
                  : '0.00'}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                per transaction
              </div>
            </div>
          </div>

          {profitReport && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profitReport.profit_by_variety?.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Profit by Variety</h3>
                  <div className="space-y-2">
                    {profitReport.profit_by_variety.map((item, index) => {
                      const varietySales = salesData.filter(sale =>
                        sale.variety_id === item.variety_id
                      );

                      const correctItemCount = varietySales.reduce((sum, sale) => {
                        const variety = varietyMap[sale.variety_id];
                        return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
                      }, 0);

                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">Variety ID: {item.variety_id}</span>
                            <span className="text-sm text-gray-600 ml-2">({correctItemCount} items)</span>
                          </div>
                          <span className="font-semibold text-teal-700">
                            ₹{parseFloat(item.total_profit).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {profitReport.profit_by_salesperson?.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Profit by Salesperson</h3>
                  <div className="space-y-2">
                    {profitReport.profit_by_salesperson.map((item, index) => {
                      const salespersonSales = salesData.filter(sale =>
                        sale.salesperson_name === item.salesperson_name
                      );

                      const correctItemCount = salespersonSales.reduce((sum, sale) => {
                        const variety = varietyMap[sale.variety_id];
                        return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
                      }, 0);

                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{item.salesperson_name}</span>
                            <span className="text-sm text-gray-600 ml-2">({correctItemCount} items)</span>
                          </div>
                          <span className="font-semibold text-teal-700">
                            ₹{parseFloat(item.total_profit).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'range' && rangeReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-1">
                    ₹{(rangeReport.summary.totalRevenue / 1000).toFixed(1)}K
                  </h3>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-slate-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">{rangeReport.summary.transactionCount} transactions</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <h3 className="text-3xl font-bold text-emerald-700 mt-1">
                    ₹{(rangeReport.summary.totalProfit / 1000).toFixed(1)}K
                  </h3>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
              <p className="text-sm text-gray-600">{rangeReport.summary.profitMargin.toFixed(1)}% margin</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Sold</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-1">
                    {rangeReport.summary.totalItemsSold}
                  </h3>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Avg: ₹{rangeReport.summary.avgTransactionValue.toFixed(0)}/sale
              </p>
            </div>
          </div>

          {rangeReport.topProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Top Products</h2>
                <p className="text-sm text-gray-600">Best selling items by revenue</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rangeReport.topProducts.map((product, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-500' :
                            idx === 1 ? 'bg-gray-400' :
                              idx === 2 ? 'bg-orange-400' : 'bg-gray-300'
                            }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">{product.quantity}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ₹{product.revenue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-green-600">
                            ₹{product.profit.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rangeReport.dailyData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Daily Breakdown</h2>
                <p className="text-sm text-gray-600">Day-by-day performance</p>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Transactions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rangeReport.dailyData.map((day, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {day.transactions}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ₹{day.revenue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-green-600">
                            ₹{day.profit.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'daily' && (!dailyReport || !dailyReport.sales_summary) && !loading && (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No data available for this date</p>
          <p className="text-sm text-gray-400">Add some transactions to see the report</p>
        </div>
      )}

      {viewMode === 'range' && !rangeReport && !loading && (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No data available for this period</p>
          <p className="text-sm text-gray-400">Select a date range with transactions</p>
        </div>
      )}
    </div>
  );
}