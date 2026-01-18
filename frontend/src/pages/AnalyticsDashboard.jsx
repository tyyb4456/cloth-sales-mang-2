import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Award, AlertCircle, Users, Calendar } from 'lucide-react';
import api from '../api/api';

import InventoryAnalyticsDashboard from '../components/InventoryAnalyticsDashboard';

const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end };
};

const getCustomDateRange = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end };
};

const fetchAnalyticsByDateRange = async (startDate, endDate) => {
  try {
    const [salesRes, inventoryRes, returnsRes, varietiesRes] = await Promise.all([
      api.get('/sales/'),
      api.get('/supplier/inventory'),
      api.get('/supplier/returns'),
      api.get('/varieties/')
    ]);

    const [allSales, allInventory, allReturns, varieties] = [
      salesRes.data,
      inventoryRes.data,
      returnsRes.data,
      varietiesRes.data
    ];

    const sales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const inventory = allInventory.filter(i => {
      const supplyDate = new Date(i.supply_date);
      supplyDate.setHours(0, 0, 0, 0);
      return supplyDate >= startDate && supplyDate <= endDate;
    });

    const returns = allReturns.filter(r => {
      const returnDate = new Date(r.return_date);
      returnDate.setHours(0, 0, 0, 0);
      return returnDate >= startDate && returnDate <= endDate;
    });

    const varietyMap = {};
    varieties.forEach(v => {
      varietyMap[v.id] = v;
    });

    const totalRevenue = sales.reduce((sum, sale) =>
      sum + (parseFloat(sale.selling_price) * parseFloat(sale.quantity)), 0
    );

    const totalProfit = sales.reduce((sum, sale) =>
      sum + parseFloat(sale.profit), 0
    );

    const totalSales = sales.length;

    const totalItemsSold = sales.reduce((sum, sale) => {
      const variety = varietyMap[sale.variety_id];
      return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    }, 0);

    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const midPoint = Math.floor(days / 2);
    const midDate = new Date(startDate);
    midDate.setDate(midDate.getDate() + midPoint);

    const firstHalfSales = sales.filter(s => new Date(s.sale_date) < midDate);
    const secondHalfSales = sales.filter(s => new Date(s.sale_date) >= midDate);

    const firstHalfRevenue = firstHalfSales.reduce((sum, s) =>
      sum + (parseFloat(s.selling_price) * parseFloat(s.quantity)), 0
    );
    const secondHalfRevenue = secondHalfSales.reduce((sum, s) =>
      sum + (parseFloat(s.selling_price) * parseFloat(s.quantity)), 0
    );

    const growthRate = firstHalfRevenue > 0
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
      : 0;

    const salesByDate = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      salesByDate[dateKey] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateKey: dateKey,
        revenue: 0,
        profit: 0,
        sales: 0
      };
    }

    sales.forEach(sale => {
      const dateKey = sale.sale_date;
      if (salesByDate[dateKey]) {
        const saleRevenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
        const saleProfit = parseFloat(sale.profit);

        salesByDate[dateKey].revenue += saleRevenue;
        salesByDate[dateKey].profit += saleProfit;
        salesByDate[dateKey].sales += 1;
      }
    });

    const salesData = Object.values(salesByDate).sort((a, b) =>
      new Date(a.dateKey) - new Date(b.dateKey)
    );

    const productStats = {};
    sales.forEach(sale => {
      const variety = varietyMap[sale.variety_id];
      const name = variety ? variety.name : `Product ${sale.variety_id}`;

      if (!productStats[name]) {
        productStats[name] = {
          name,
          revenue: 0,
          profit: 0,
          quantity: 0,
          items_sold: 0,
          measurement_unit: variety?.measurement_unit || 'pieces',
          margin: 0
        };
      }

      const revenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
      const profit = parseFloat(sale.profit);

      productStats[name].revenue += revenue;
      productStats[name].profit += profit;
      productStats[name].quantity += parseFloat(sale.quantity);
      productStats[name].items_sold += getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    });

    Object.values(productStats).forEach(product => {
      product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const salespersonStats = {};
    sales.forEach(sale => {
      const variety = varietyMap[sale.variety_id];
      const name = sale.salesperson_name;

      if (!salespersonStats[name]) {
        salespersonStats[name] = {
          name,
          transactions: 0,
          revenue: 0,
          profit: 0,
          quantity: 0,
          items_sold: 0,
          avgTransactionValue: 0
        };
      }

      const revenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
      const profit = parseFloat(sale.profit);

      salespersonStats[name].transactions += 1;
      salespersonStats[name].revenue += revenue;
      salespersonStats[name].profit += profit;
      salespersonStats[name].quantity += parseFloat(sale.quantity);
      salespersonStats[name].items_sold += getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    });

    Object.values(salespersonStats).forEach(person => {
      person.avgTransactionValue = person.transactions > 0
        ? person.revenue / person.transactions
        : 0;
    });

    const salespersonPerformance = Object.values(salespersonStats)
      .sort((a, b) => b.revenue - a.revenue);

    const supplierStats = {};

    inventory.forEach(inv => {
      const name = inv.supplier_name;
      if (!supplierStats[name]) {
        supplierStats[name] = { name, totalSupply: 0, returns: 0, netAmount: 0, reliability: 0 };
      }
      supplierStats[name].totalSupply += parseFloat(inv.total_amount);
    });

    returns.forEach(ret => {
      const name = ret.supplier_name;
      if (!supplierStats[name]) {
        supplierStats[name] = { name, totalSupply: 0, returns: 0, netAmount: 0, reliability: 0 };
      }
      supplierStats[name].returns += parseFloat(ret.total_amount);
    });

    Object.values(supplierStats).forEach(supplier => {
      supplier.netAmount = supplier.totalSupply - supplier.returns;
      supplier.reliability = supplier.totalSupply > 0
        ? ((supplier.totalSupply - supplier.returns) / supplier.totalSupply) * 100
        : 100;
    });

    const suppliers = Object.values(supplierStats)
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 5);

    const totalRevenueByProduct = topProducts.reduce((sum, p) => sum + p.revenue, 0);
    const productMix = topProducts.map(product => ({
      name: product.name,
      value: totalRevenueByProduct > 0 ? (product.revenue / totalRevenueByProduct) * 100 : 0,
      amount: product.revenue
    }));

    const topProduct = topProducts.length > 0 ? topProducts[0] : null;
    const topProductShare = topProduct && totalRevenue > 0 ? (topProduct.revenue / totalRevenue) * 100 : 0;

    return {
      kpis: {
        totalRevenue: Math.round(totalRevenue),
        totalProfit: Math.round(totalProfit),
        totalSales,
        totalItemsSold,
        avgOrderValue: Math.round(avgOrderValue),
        growthRate: parseFloat(growthRate.toFixed(1)),
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        topProduct: topProduct ? topProduct.name : 'N/A',
        topProductShare: parseFloat(topProductShare.toFixed(1))
      },
      salesData,
      topProducts,
      suppliers,
      productMix,
      salespersonPerformance
    };
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    throw error;
  }
};

const AnalyticsDashboard = () => {
  const [rangeMode, setRangeMode] = useState('preset');
  const [timeRange, setTimeRange] = useState(7);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        let dateRange;
        if (rangeMode === 'preset') {
          dateRange = getDateRange(timeRange);
        } else if (rangeMode === 'custom' && customStartDate && customEndDate) {
          dateRange = getCustomDateRange(customStartDate, customEndDate);
        } else {
          setLoading(false);
          return;
        }

        const data = await fetchAnalyticsByDateRange(dateRange.startDate, dateRange.endDate);
        setAnalytics(data);
      } catch (err) {
        setError('Failed to load analytics data. Please check if the API is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timeRange, rangeMode, customStartDate, customEndDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-gray-200 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-red-200 dark:border-red-800 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

const COLORS = [
  '#7A8CA5', // Muted Steel Blue
  '#8FA897', // Soft Sage Green
  '#C2A98D', // Warm Sand
  '#9B8FB3', // Dusty Lavender
  '#86A6A6', // Muted Teal
  '#B08E8E', // Soft Rose
];

  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== null && trend !== undefined && (
        <div className="mt-4 flex items-center">
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
          ) : trend < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
          ) : null}
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {trend === 0 ? '0.0%' : `${Math.abs(trend).toFixed(1)}%`}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs previous period</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time business insights and performance metrics</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setRangeMode('preset')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  rangeMode === 'preset' 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Preset
              </button>
              <button
                onClick={() => setRangeMode('custom')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                  rangeMode === 'custom' 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar size={16} />
                Custom Range
              </button>
            </div>

            {/* Preset Buttons */}
            {rangeMode === 'preset' && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeRange(days)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      timeRange === days 
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range */}
        {rangeMode === 'custom' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Revenue"
            value={`₹${(analytics.kpis.totalRevenue / 1000).toFixed(1)}K`}
            subtitle={`${analytics.kpis.totalSales} transactions`}
            icon={DollarSign}
            trend={analytics.kpis.growthRate}
            color="bg-gray-400 dark:bg-gray-600"
          />
          <KPICard
            title="Total Profit"
            value={`₹${(analytics.kpis.totalProfit / 1000).toFixed(1)}K`}
            subtitle={`${analytics.kpis.profitMargin.toFixed(1)}% margin`}
            icon={TrendingUp}
            trend={null}
            color="bg-gray-400 dark:bg-gray-600"
          />
          <KPICard
            title="Orders"
            value={analytics.kpis.totalSales}
            subtitle={`₹${analytics.kpis.avgOrderValue.toLocaleString()} avg value`}
            icon={ShoppingCart}
            trend={null}
            color="bg-gray-400 dark:bg-gray-600"
          />
          <KPICard
            title="Items Sold"
            value={analytics.kpis.totalItemsSold}
            subtitle={`${analytics.kpis.topProduct}`}
            icon={Package}
            color="bg-gray-400 dark:bg-gray-600"
          />
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Sales Trend ({timeRange} Days)
          </h2>
          {analytics.salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analytics.salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  className="text-gray-600 dark:text-gray-400"
                  style={{ fontSize: '12px' }}
                  angle={timeRange > 30 ? -45 : 0}
                  textAnchor={timeRange > 30 ? "end" : "middle"}
                  height={timeRange > 30 ? 80 : 30}
                />
                <YAxis stroke="currentColor" className="text-gray-600 dark:text-gray-400" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'rgb(243 244 246)'
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#765496"
                  strokeWidth={2}
                  name="Revenue (₹)"
                  dot={timeRange <= 30}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#bf5095"
                  strokeWidth={2}
                  name="Profit (₹)"
                  dot={timeRange <= 30}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No sales data available for this period</p>
          )}
        </div>

        {/* Top Products Bar Chart */}
        {analytics.topProducts && analytics.topProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Products by Profit</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.topProducts.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <XAxis
                  dataKey="name"
                  stroke="currentColor"
                  className="text-gray-600 dark:text-gray-400"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="currentColor" className="text-gray-600 dark:text-gray-400" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'rgb(243 244 246)'
                  }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Profit']}
                />
                <Bar
                  dataKey="profit"
                  fill="#8FAEA3"
                  activeBar={{ fill: '#7FA096' }}
                  name="Profit (₹)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Product Details Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Items Sold</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.topProducts.slice(0, 5).map((product, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition`}>
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-gray-600 dark:bg-gray-500' : idx === 1 ? 'bg-gray-500 dark:bg-gray-600' : idx === 2 ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-300 dark:bg-gray-800'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{product.measurement_unit}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {product.items_sold}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        ₹{product.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        ₹{product.profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{product.margin.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Mix Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Revenue by Product</h2>
            {analytics.productMix.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.productMix}
                    cx="50%"
                    cy="50%"
                    outerRadius={115}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={false}
                  >
                    {analytics.productMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgb(31 41 55)',
                      border: '1px solid rgb(75 85 99)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'rgb(243 244 246)'
                    }}
                    formatter={(value, name, props) => [`₹${props.payload.amount.toLocaleString()}`, 'Revenue']} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No product data available</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Products by Revenue</h2>
            {analytics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topProducts.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis
                    type="number"
                    stroke="currentColor"
                    className="text-gray-600 dark:text-gray-400"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="currentColor"
                    className="text-gray-600 dark:text-gray-400"
                    style={{ fontSize: '12px' }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(31 41 55)',
                      border: '1px solid rgb(75 85 99)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'rgb(243 244 246)'
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#7C8DB0" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No product data available</p>
            )}
          </div>
        </div>

        {/* Salesperson Performance */}
        {analytics.salespersonPerformance && analytics.salespersonPerformance.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Salesperson Performance</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Individual sales team metrics and achievements</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Salesperson</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Items Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Avg Transaction</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Performance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.salespersonPerformance.map((person, idx) => {
                    const isTopPerformer = idx === 0;
                    const profitMargin = person.revenue > 0 ? (person.profit / person.revenue) * 100 : 0;

                    return (
                      <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition ${isTopPerformer ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isTopPerformer ? "bg-gray-500 dark:bg-gray-600" : "bg-gray-300 dark:bg-gray-700"}`}>
                              <span className="text-sm font-semibold text-white">
                                {person.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{person.name}</p>
                              {isTopPerformer && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                  <Award size={12} /> Top Performer
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {person.transactions}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {person.items_sold}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ₹{person.revenue.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            ₹{person.profit.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            ₹{person.avgTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-gray-500 dark:bg-gray-400"
                                style={{ width: `${Math.min(profitMargin * 2, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {profitMargin.toFixed(1)}% margin
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Transactions</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {analytics.salespersonPerformance.reduce((sum, p) => sum + p.transactions, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Items Sold</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {analytics.salespersonPerformance.reduce((sum, p) => sum + p.items_sold, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Revenue</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Profit</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.profit, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Team Avg</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ₹{(analytics.salespersonPerformance.reduce((sum, p) => sum + p.avgTransactionValue, 0) /
                      analytics.salespersonPerformance.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supplier and Daily Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Supplier Reliability */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Supplier Reliability</h2>
            </div>
            <div className="overflow-x-auto">
              {analytics.suppliers.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Net Supply</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Reliability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.suppliers.map((supplier, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{supplier.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                          ₹{(supplier.netAmount / 1000).toFixed(0)}K
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div className="bg-gray-600 dark:bg-gray-400 h-2 rounded-full" style={{ width: `${supplier.reliability}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.reliability.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No supplier data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        {analytics.salesData && analytics.salesData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daily Breakdown</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Day-by-day performance</p>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.salesData.map((day, idx) => {
                    const profitMargin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {day.date}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {day.sales}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ₹{day.revenue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            ₹{day.profit.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(profitMargin, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                              {profitMargin.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Days</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {analytics.salesData.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Transactions</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {analytics.salesData.reduce((sum, d) => sum + d.sales, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Revenue</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ₹{analytics.salesData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Profit</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ₹{analytics.salesData.reduce((sum, d) => sum + d.profit, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Analytics Section */}
        <div className="mt-12">
          <InventoryAnalyticsDashboard timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;