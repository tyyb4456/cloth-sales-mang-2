// frontend/src/components/FinancialDashboard.jsx - MOBILE-FIRST RESPONSIVE VERSION

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, 
  Calendar, ArrowUp, ArrowDown, Activity, RefreshCw 
} from 'lucide-react';
import api from '../api/api';

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
      const months = [];
      for (let i = 5; i >= 0; i--) {
        months.push(getMonthsBack(i));
      }

      const monthlyReports = await Promise.all(
        months.map(async (m) => {
          try {
            const response = await api.get(`/expenses/financial-report/${m.year}/${m.month}`);
            const data = response.data;
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

      const currentMonth = new Date();
      const expensesResponse = await api.get(
        `/expenses/month/${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`
      );
      const expenses = expensesResponse.data;

      const categoryMap = (expenses || []).reduce((acc, expense) => {
        const category = expense.category.replace(/_/g, ' ').toUpperCase();
        acc[category] = (acc[category] || 0) + parseFloat(expense.amount);
        return acc;
      }, {});

      const expenseBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2))
      }));

      const monthlyTrends = monthlyReports.map(report => ({
        month: report.label,
        revenue: parseFloat(report.total_revenue || 0),
        expenses: parseFloat(report.total_expenses || 0),
        profit: parseFloat(report.total_profit || 0),
        netIncome: parseFloat(report.net_income || 0)
      }));

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
    '#5f6388', '#8b7fb5', '#5f9a8d', '#c2a46b', 
    '#b56f6f', '#5f8fa3', '#8fa06a'
  ];

  const KPICard = ({ title, value, growth, icon: Icon, color, prefix = '₹' }) => (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
            {prefix}{value.toLocaleString()}
          </p>
          {growth !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {growth > 0 ? (
                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 shrink-0" />
              ) : growth < 0 ? (
                <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 shrink-0" />
              ) : null}
              <span className={`text-xs sm:text-sm font-medium ${
                growth > 0 ? 'text-green-600' : growth < 0 ? 'text-gray-600' : 'text-gray-600'
              }`}>
                {Math.abs(growth).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 truncate">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color} shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* MOBILE-FIRST HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full sm:w-auto">
            <Calendar size={18} className="text-gray-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">Last 6 Months</span>
          </div>
        </div>

        {/* MOBILE-FIRST KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
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

        {/* MOBILE-FIRST REVENUE VS EXPENSES TREND */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Revenue vs Expenses Trend</h2>
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
              <XAxis 
                dataKey="month" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
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

        {/* MOBILE-FIRST PROFIT ANALYSIS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          
          {/* Profit Trend Line Chart */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Profit Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                />
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
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Expense Distribution</h2>
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
                <div className="text-center">
                  <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No expense data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE-FIRST MONTHLY COMPARISON BAR CHART */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Monthly Financial Comparison</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dashboardData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
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
              <Bar dataKey="revenue" fill="#5f8fa3" name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#b56f6f" name="Expenses" radius={[8, 8, 0, 0]} />
              <Bar dataKey="netIncome" fill="#5f9a8d" name="Net Income" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MOBILE-FIRST EXPENSE DETAILS TABLE */}
        {dashboardData.expenseBreakdown.length > 0 && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Expense Category Details</h2>
            </div>
            
            {/* MOBILE: CARD LAYOUT */}
            <div className="block lg:hidden divide-y divide-gray-200">
              {dashboardData.expenseBreakdown
                .sort((a, b) => b.value - a.value)
                .map((item, idx) => {
                  const total = dashboardData.expenseBreakdown.reduce((sum, i) => sum + i.value, 0);
                  const percentage = (item.value / total) * 100;
                  return (
                    <div key={idx} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{item.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <span className="font-semibold text-gray-900">₹{item.value.toLocaleString()}</span>
                        <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* DESKTOP: TABLE LAYOUT */}
            <div className="hidden lg:block overflow-x-auto">
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