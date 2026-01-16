import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Award, AlertCircle, Users } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

// Helper function to get item count
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

const fetchRealAnalytics = async (days) => {
  try {
    const { startDate, endDate } = getDateRange(days);

    const [salesRes, inventoryRes, returnsRes, varietiesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/sales/`),
      fetch(`${API_BASE_URL}/supplier/inventory`),
      fetch(`${API_BASE_URL}/supplier/returns`),
      fetch(`${API_BASE_URL}/varieties/`)
    ]);

    if (!salesRes.ok || !inventoryRes.ok || !returnsRes.ok || !varietiesRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const [allSales, allInventory, allReturns, varieties] = await Promise.all([
      salesRes.json(),
      inventoryRes.json(),
      returnsRes.json(),
      varietiesRes.json()
    ]);

    // Filter data based on date range
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

    console.log(`📊 Analyzing ${days} days:`, {
      totalSales: sales.length,
      dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
    });

    // Create variety map
    const varietyMap = {};
    varieties.forEach(v => {
      varietyMap[v.id] = v;
    });

    // CORRECT CALCULATION - Match Reports page logic
    // Calculate totals EXACTLY like the backend does
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

    // Growth calculation
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

    // FIXED: Sales trend data - Initialize with zeros
    const salesByDate = {};
    
    // Fix timezone issue: use the date string directly without converting
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD format
      
      salesByDate[dateKey] = { 
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateKey: dateKey,
        revenue: 0, 
        profit: 0, 
        sales: 0 
      };
    }

    // CRITICAL FIX: Calculate revenue exactly like Reports page
    sales.forEach(sale => {
      const dateKey = sale.sale_date;
      if (salesByDate[dateKey]) {
        // Match the backend calculation exactly
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

    // Debug: Log a few sample dates
    console.log('📈 Sample sales data:', salesData.slice(-5).map(d => ({
      date: d.date,
      revenue: d.revenue.toFixed(2),
      profit: d.profit.toFixed(2)
    })));

    // Product stats
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

    // Salesperson performance
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

    // Supplier performance
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

    // Product mix
    const totalRevenueByProduct = topProducts.reduce((sum, p) => sum + p.revenue, 0);
    const productMix = topProducts.map(product => ({
      name: product.name,
      value: totalRevenueByProduct > 0 ? (product.revenue / totalRevenueByProduct) * 100 : 0,
      amount: product.revenue
    }));

    const topProduct = topProducts.length > 0 ? topProducts[0] : null;
    const topProductShare = topProduct && totalRevenue > 0 ? (topProduct.revenue / totalRevenue) * 100 : 0;

    console.log('✅ Final KPIs:', {
      totalRevenue: totalRevenue.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalSales,
      dataPoints: salesData.length
    });

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
  const [timeRange, setTimeRange] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRealAnalytics(timeRange);
        setAnalytics(data);
      } catch (err) {
        setError('Failed to load analytics data. Please check if the API is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-red-200 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error Loading Data</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#8A8F98', '#9AA3B2', '#A6B8B1', '#B5B8A3', '#C2B2A2', '#B7A6B5'];

  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== null && trend !== undefined && (
        <div className="mt-4 flex items-center">
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
          ) : trend < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
          ) : null}
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {trend === 0 ? '0.0%' : `${Math.abs(trend).toFixed(1)}%`}
          </span>
          <span className="text-sm text-gray-500 ml-1">vs previous period</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  timeRange === days ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Revenue"
            value={`₹${(analytics.kpis.totalRevenue / 1000).toFixed(1)}K`}
            subtitle={`${analytics.kpis.totalSales} transactions`}
            icon={DollarSign}
            trend={analytics.kpis.growthRate}
            color="bg-gray-400"
          />
          <KPICard
            title="Total Profit"
            value={`₹${(analytics.kpis.totalProfit / 1000).toFixed(1)}K`}
            subtitle={`${analytics.kpis.profitMargin.toFixed(1)}% margin`}
            icon={TrendingUp}
            trend={null}
            color="bg-gray-400"
          />
          <KPICard
            title="Orders"
            value={analytics.kpis.totalSales}
            subtitle={`₹${analytics.kpis.avgOrderValue.toLocaleString()} avg value`}
            icon={ShoppingCart}
            trend={null}
            color="bg-gray-400"
          />
          <KPICard
            title="Items Sold"
            value={analytics.kpis.totalItemsSold}
            subtitle={`${analytics.kpis.topProduct}`}
            icon={Package}
            color="bg-gray-400"
          />
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Sales Trend ({timeRange} Days)
          </h2>
          {analytics.salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analytics.salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  angle={timeRange > 30 ? -45 : 0}
                  textAnchor={timeRange > 30 ? "end" : "middle"}
                  height={timeRange > 30 ? 80 : 30}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
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
            <p className="text-center text-gray-500 py-8">No sales data available for this period</p>
          )}
        </div>

               {/* Top 5 Products by Profit - NEW BAR CHART */}
        {analytics.topProducts && analytics.topProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Products by Profit</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.topProducts.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Profit']}
                />
                {/* <Legend /> */}
                <Bar
                  dataKey="profit"
                  fill="#8FAEA3"
                  activeBar={{ fill: '#7FA096' }}
                  name="Profit (₹)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Profit Summary Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Items Sold</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.topProducts.slice(0, 5).map((product, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-gray-600' : idx === 1 ? 'bg-gray-500' : idx === 2 ? 'bg-gray-400' : 'bg-gray-300'
                          }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{product.measurement_unit}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {product.items_sold}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ₹{product.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        ₹{product.profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-700">{product.margin.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Product</h2>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value, name, props) => [`₹${props.payload.amount.toLocaleString()}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No product data available</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Products by Revenue</h2>
            {analytics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topProducts.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

                  <XAxis
                    type="number"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />

                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    width={110}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />

                  <Bar
                    dataKey="revenue"
                    fill="#7C8DB0"
                    radius={[0, 8, 8, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>

            ) : (
              <p className="text-center text-gray-500 py-8">No product data available</p>
            )}
          </div>
        </div>


        {/* Salesperson Performance - ENHANCED */}
        {analytics.salespersonPerformance && analytics.salespersonPerformance.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200 bg-linear-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Salesperson Performance</h2>
                  <p className="text-sm text-gray-600">Individual sales team metrics and achievements</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Salesperson</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Items Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Avg Transaction</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Performance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {analytics.salespersonPerformance.map((person, idx) => {
                    const isTopPerformer = idx === 0;
                    const profitMargin = person.revenue > 0 ? (person.profit / person.revenue) * 100 : 0;

                    return (
                      <tr key={idx} className={`hover:bg-gray-50 transition ${isTopPerformer ? "bg-gray-100" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isTopPerformer ? "bg-gray-500" : "bg-gray-300"
                              }`}>
                              <span className="text-sm font-semibold text-white">
                                {person.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{person.name}</p>
                              {isTopPerformer && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-700 font-medium">
                                  <Award size={12} /> Top Performer
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                            {person.transactions}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {person.items_sold}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ₹{person.revenue.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-700">
                            ₹{person.profit.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-700">
                            ₹{person.avgTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-gray-500"
                                style={{ width: `${Math.min(profitMargin * 2, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
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

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Transactions</p>
                  <p className="text-lg font-bold text-gray-900">
                    {analytics.salespersonPerformance.reduce((sum, p) => sum + p.transactions, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Items Sold</p>
                  <p className="text-lg font-bold text-gray-900">
                    {analytics.salespersonPerformance.reduce((sum, p) => sum + p.items_sold, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Profit</p>
                  <p className="text-lg font-bold text-gray-700">
                    ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.profit, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Team Avg</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{(analytics.salespersonPerformance.reduce((sum, p) => sum + p.avgTransactionValue, 0) /
                      analytics.salespersonPerformance.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}






        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">


          {/* Supplier Reliability */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Supplier Reliability</h2>
            </div>
            <div className="overflow-x-auto">
              {analytics.suppliers.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Net Supply</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Reliability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.suppliers.map((supplier, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-bold text-gray-600">{supplier.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ₹{(supplier.netAmount / 1000).toFixed(0)}K
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div className="bg-gray-600 h-2 rounded-full" style={{ width: `${supplier.reliability}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{supplier.reliability.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-8">No supplier data available</p>
              )}
            </div>

          </div>
        </div>

        {/* Rest of the dashboard remains the same... */}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;