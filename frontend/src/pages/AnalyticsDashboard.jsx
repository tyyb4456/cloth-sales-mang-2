// frontend/src/pages/AnalyticsDashboard.jsx - WITH MODERN SKELETON LOADING UI
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Award, AlertCircle, Users, Calendar } from 'lucide-react';
import InventoryAnalyticsDashboard from '../components/InventoryAnalyticsDashboard';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '../components/skeleton/AnalyticsSkeleton';
import { fetchAnalyticsByDateRange, KPICard } from '../components/core/AnalyticsFunction'



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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8 border border-red-200 dark:border-red-800 max-w-md w-full">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">Error Loading Data</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const COLORS = [
    '#7A8CA5', '#8FA897', '#C2A98D', '#9B8FB3', '#86A6A6', '#B08E8E',
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analytics Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Real-time business insights and performance metrics</p>
          </div>

          {/* DATE RANGE CONTROLS */}
          <div className="flex flex-col gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setRangeMode('preset')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition ${
                  rangeMode === 'preset' 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Preset
              </button>
              <button
                onClick={() => setRangeMode('custom')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 ${
                  rangeMode === 'custom' 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar size={14} className="hidden sm:block" />
                <span>Custom</span>
              </button>
            </div>

            {rangeMode === 'preset' && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeRange(days)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
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

        {/* CUSTOM DATE RANGE */}
        {rangeMode === 'custom' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <>
            {/* KPI CARDS SKELETON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <SkeletonKPICard />
              <SkeletonKPICard />
              <SkeletonKPICard />
              <SkeletonKPICard />
            </div>

            {/* SALES TREND CHART SKELETON */}
            <SkeletonChart />

            <div className="mt-6 sm:mt-8">
              <SkeletonTable />
            </div>

            {/* PRODUCT MIX CHARTS SKELETON */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mt-6 sm:mt-8">
              <SkeletonChart height={250} />
              <SkeletonChart height={250} />
            </div>

            {/* SALESPERSON TABLE SKELETON */}
            <div className="mt-6 sm:mt-8">
              <SkeletonTable />
            </div>
          </>
        ) : analytics && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
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

            {/* SALES TREND CHART */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Sales Trend ({timeRange} Days)
              </h2>
              {analytics.salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                    <XAxis
                      dataKey="date"
                      stroke="currentColor"
                      className="text-gray-600 dark:text-gray-400"
                      style={{ fontSize: '11px' }}
                      angle={timeRange > 30 ? -45 : 0}
                      textAnchor={timeRange > 30 ? "end" : "middle"}
                      height={timeRange > 30 ? 80 : 30}
                    />
                    <YAxis stroke="currentColor" className="text-gray-600 dark:text-gray-400" style={{ fontSize: '11px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgb(31 41 55)',
                        border: '1px solid rgb(75 85 99)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'rgb(243 244 246)',
                        fontSize: '12px'
                      }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
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
                <p className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400 py-8">No sales data available for this period</p>
              )}
            </div>

            {/* TOP PRODUCTS */}
            {analytics.topProducts && analytics.topProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Products by Profit</h2>
                
                <div className="hidden sm:block mb-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topProducts.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                      <XAxis
                        dataKey="name"
                        stroke="currentColor"
                        className="text-gray-600 dark:text-gray-400"
                        style={{ fontSize: '11px' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="currentColor" className="text-gray-600 dark:text-gray-400" style={{ fontSize: '11px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(31 41 55)',
                          border: '1px solid rgb(75 85 99)',
                          borderRadius: '8px',
                          padding: '12px',
                          color: 'rgb(243 244 246)',
                          fontSize: '12px'
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
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Product</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Items Sold</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Profit</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {analytics.topProducts.slice(0, 5).map((product, idx) => (
                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition`}>
                            <td className="px-3 sm:px-4 py-3">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm ${idx === 0 ? 'bg-gray-600 dark:bg-gray-500' : idx === 1 ? 'bg-gray-500 dark:bg-gray-600' : idx === 2 ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-300 dark:bg-gray-800'}`}>
                                {idx + 1}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">{product.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{product.measurement_unit}</div>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                {product.items_sold}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              ₹{product.revenue.toLocaleString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right font-bold text-sm sm:text-base text-green-600 dark:text-green-400 whitespace-nowrap">
                              ₹{product.profit.toLocaleString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{product.margin.toFixed(1)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCT MIX CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Revenue by Product</h2>
                {analytics.productMix.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics.productMix}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
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
                          color: 'rgb(243 244 246)',
                          fontSize: '12px'
                        }}
                        formatter={(value, name, props) => [`₹${props.payload.amount.toLocaleString()}`, 'Revenue']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No product data available</p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Products by Revenue</h2>
                {analytics.topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.topProducts.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                      <XAxis
                        type="number"
                        stroke="currentColor"
                        className="text-gray-600 dark:text-gray-400"
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="currentColor"
                        className="text-gray-600 dark:text-gray-400"
                        style={{ fontSize: '11px' }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(31 41 55)',
                          border: '1px solid rgb(75 85 99)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'rgb(243 244 246)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#7C8DB0" radius={[0, 8, 8, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No product data available</p>
                )}
              </div>
            </div>

            {/* SALESPERSON PERFORMANCE */}
            {analytics.salespersonPerformance && analytics.salespersonPerformance.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 sm:mb-8">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Salesperson Performance</h2>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Individual sales team metrics and achievements</p>
                    </div>
                  </div>
                </div>

                {/* MOBILE: Card View */}
                <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.salespersonPerformance.map((person, idx) => {
                    const isTopPerformer = idx === 0;
                    const profitMargin = person.revenue > 0 ? (person.profit / person.revenue) * 100 : 0;

                    return (
                      <div key={idx} className={`p-4 ${isTopPerformer ? "bg-gray-50 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isTopPerformer ? "bg-gray-500 dark:bg-gray-600" : "bg-gray-300 dark:bg-gray-700"}`}>
                            <span className="text-sm font-semibold text-white">
                              {person.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{person.name}</p>
                            {isTopPerformer && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                <Award size={12} /> Top Performer
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Transactions</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">{person.transactions}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Items Sold</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">{person.items_sold}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Revenue</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">₹{person.revenue.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 text-xs block mb-0.5">Profit</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold">₹{person.profit.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Profit Margin</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{profitMargin.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gray-500 dark:bg-gray-400"
                              style={{ width: `${Math.min(profitMargin * 2, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP: Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Salesperson</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Transactions</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Items Sold</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Revenue</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Profit</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Avg Transaction</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Performance</th>
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

                {/* Summary Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Transactions</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        {analytics.salespersonPerformance.reduce((sum, p) => sum + p.transactions, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Items Sold</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        {analytics.salespersonPerformance.reduce((sum, p) => sum + p.items_sold, 0)}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Revenue</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Profit</p>
                      <p className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">
                        ₹{analytics.salespersonPerformance.reduce((sum, p) => sum + p.profit, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Team Avg</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        ₹{(analytics.salespersonPerformance.reduce((sum, p) => sum + p.avgTransactionValue, 0) /
                          analytics.salespersonPerformance.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUPPLIER RELIABILITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Supplier Reliability</h2>
                </div>
                <div className="overflow-x-auto">
                  {analytics.suppliers.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Supplier</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Net Supply</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Reliability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {analytics.suppliers.map((supplier, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{supplier.name.charAt(0)}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.name}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                              ₹{(supplier.netAmount / 1000).toFixed(0)}K
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end">
                                <div className="w-12 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                  <div className="bg-gray-600 dark:bg-gray-400 h-2 rounded-full" style={{ width: `${supplier.reliability}%` }}></div>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.reliability.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No supplier data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* INVENTORY ANALYTICS */}
            <div className="mt-8 sm:mt-12">
              <InventoryAnalyticsDashboard timeRange={timeRange} />
            </div>
          </>
        )}
      </div>

      {/* SHIMMER ANIMATION */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;