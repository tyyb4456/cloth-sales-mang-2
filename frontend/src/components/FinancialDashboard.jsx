import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Calendar, ArrowUp, ArrowDown, Activity } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const FinancialDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    monthlyTrends: [],
    expenseBreakdown: [],
    profitTrend: [],
    kpis: {}
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getMonthsBack = (monthsAgo) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get data for last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        months.push(getMonthsBack(i));
      }

      // Fetch financial reports for each month
      const monthlyReports = await Promise.all(
        months.map(async (m) => {
          try {
            const response = await fetch(`${API_BASE_URL}/expenses/financial-report/${m.year}/${m.month}`);
            const data = await response.json();
            return { ...data, label: m.label };
          } catch (error) {
            return {
              total_revenue: 0,
              total_profit: 0,
              total_expenses: 0,
              net_income: 0,
              profit_margin: 0,
              expense_ratio: 0,
              label: m.label
            };
          }
        })
      );

      // Get expense breakdown for current month
      const currentMonth = new Date();
      const expensesResponse = await fetch(
        `${API_BASE_URL}/expenses/month/${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`
      );
      const expenses = await expensesResponse.json();

      // Calculate expense breakdown by category
      const categoryMap = (expenses || []).reduce((acc, expense) => {
        const category = expense.category.replace(/_/g, ' ').toUpperCase();
        acc[category] = (acc[category] || 0) + parseFloat(expense.amount);
        return acc;
      }, {});

      const expenseBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2))
      }));

      // Prepare monthly trends data
      const monthlyTrends = monthlyReports.map(report => ({
        month: report.label,
        revenue: parseFloat(report.total_revenue || 0),
        expenses: parseFloat(report.total_expenses || 0),
        profit: parseFloat(report.total_profit || 0),
        netIncome: parseFloat(report.net_income || 0)
      }));

      // Calculate KPIs
      const currentMonthData = monthlyReports[monthlyReports.length - 1];
      const lastMonthData = monthlyReports[monthlyReports.length - 2] || currentMonthData;

      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const kpis = {
        revenue: {
          value: parseFloat(currentMonthData.total_revenue || 0),
          growth: calculateGrowth(
            parseFloat(currentMonthData.total_revenue || 0),
            parseFloat(lastMonthData.total_revenue || 0)
          )
        },
        expenses: {
          value: parseFloat(currentMonthData.total_expenses || 0),
          growth: calculateGrowth(
            parseFloat(currentMonthData.total_expenses || 0),
            parseFloat(lastMonthData.total_expenses || 0)
          )
        },
        profit: {
          value: parseFloat(currentMonthData.total_profit || 0),
          growth: calculateGrowth(
            parseFloat(currentMonthData.total_profit || 0),
            parseFloat(lastMonthData.total_profit || 0)
          )
        },
        netIncome: {
          value: parseFloat(currentMonthData.net_income || 0),
          growth: calculateGrowth(
            parseFloat(currentMonthData.net_income || 0),
            parseFloat(lastMonthData.net_income || 0)
          )
        }
      };

      setDashboardData({
        monthlyTrends,
        expenseBreakdown,
        profitTrend: monthlyTrends,
        kpis
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    '#5f6388', // balanced indigo
    '#8b7fb5', // medium lavender
    '#5f9a8d', // teal
    '#c2a46b', // warm sand
    '#b56f6f', // muted red
    '#5f8fa3', // blue-teal
    '#8fa06a'  // olive green
  ];




  const KPICard = ({ title, value, growth, icon: Icon, color, prefix = '₹' }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {prefix}{value.toLocaleString()}
          </p>
          {growth !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {growth > 0 ? (
                <ArrowUp className="w-4 h-4 text-green-600" />
              ) : growth < 0 ? (
                <ArrowDown className="w-4 h-4 text-gray-600" />
              ) : null}
              <span className={`text-sm font-medium ${growth > 0 ? 'text-green-200' : growth < 0 ? 'text-gray-600' : 'text-gray-600'
                }`}>
                {Math.abs(growth).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-600 mt-1">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Last 6 Months</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Revenue"
            value={dashboardData.kpis.revenue?.value || 0}
            growth={dashboardData.kpis.revenue?.growth}
            icon={DollarSign}
            color="bg-gray-500"
          />
          <KPICard
            title="Total Expenses"
            value={dashboardData.kpis.expenses?.value || 0}
            growth={dashboardData.kpis.expenses?.growth}
            icon={TrendingDown}
            color="bg-gray-500"
          />
          <KPICard
            title="Gross Profit"
            value={dashboardData.kpis.profit?.value || 0}
            growth={dashboardData.kpis.profit?.growth}
            icon={TrendingUp}
            color="bg-gray-500"
          />
          <KPICard
            title="Net Income"
            value={dashboardData.kpis.netIncome?.value || 0}
            growth={dashboardData.kpis.netIncome?.growth}
            icon={Activity}
            color="bg-gray-500"
          />
        </div>

        {/* Revenue vs Expenses Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue vs Expenses Trend</h2>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={dashboardData.monthlyTrends}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#e66730"
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Profit Trend Line Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profit Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#0f805a"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Gross Profit"
                />
                <Line
                  type="monotone"
                  dataKey="netIncome"
                  stroke="#7d68ab"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Net Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Expense Distribution</h2>
            {dashboardData.expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-75 text-gray-500">
                No expense data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Comparison Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Financial Comparison</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dashboardData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
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
              {/* <Legend /> */}
              <Bar dataKey="revenue" fill="#5f8fa3" name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#b56f6f" name="Expenses" radius={[8, 8, 0, 0]} />
              <Bar dataKey="netIncome" fill="#5f9a8d" name="Net Income" radius={[8, 8, 0, 0]} />

            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Details Table */}
        {dashboardData.expenseBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Expense Category Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dashboardData.expenseBreakdown
                    .sort((a, b) => b.value - a.value)
                    .map((item, idx) => {
                      const total = dashboardData.expenseBreakdown.reduce((sum, i) => sum + i.value, 0);
                      const percentage = (item.value / total) * 100;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              <span className="font-medium text-gray-900">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            ₹{item.value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {percentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;