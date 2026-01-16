import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, TrendingDown, DollarSign, AlertCircle, PieChart, Loader2 } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Functions
const getExpensesByMonth = (year, month) => api.get(`/expenses/month/${year}/${month}`);
const createExpense = (data) => api.post('/expenses/', data);
const deleteExpense = (id) => api.delete(`/expenses/${id}`);
const getFinancialReport = (date) => api.get(`/expenses/financial-report/${date}`);

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [financialReport, setFinancialReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  const categories = [
    { value: 'rent', label: 'Rent' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'salaries', label: 'Salaries' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'taxes', label: 'Taxes' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadExpenses();
    loadFinancialReport();
  }, [selectedDate]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedDate.split('-');
      const response = await getExpensesByMonth(parseInt(year), parseInt(month));
      setExpenses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
      alert('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialReport = async () => {
    try {
      const [year, month] = selectedDate.split('-');
      const response = await api.get(`/expenses/financial-report/${parseInt(year)}/${parseInt(month)}`);
      setFinancialReport(response.data);
    } catch (error) {
      console.error('Error loading financial report:', error);
      setFinancialReport(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.amount || !formData.expense_date) {
      alert('Please fill all required fields');
      return;
    }
    
    try {
      await createExpense({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      setFormData({
        category: '',
        amount: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: ''
      });
      setShowForm(false);
      loadExpenses();
      loadFinancialReport();
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(error.response?.data?.detail || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    
    try {
      await deleteExpense(id);
      loadExpenses();
      loadFinancialReport();
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const categoryLabel = categories.find(c => c.value === expense.category)?.label || expense.category;
    acc[categoryLabel] = (acc[categoryLabel] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Get financial data from report
  const totalRevenue = financialReport ? parseFloat(financialReport.total_revenue) : 0;
  const totalProfit = financialReport ? parseFloat(financialReport.total_profit) : 0;
  const netIncome = financialReport ? parseFloat(financialReport.net_income) : 0;
  const profitMargin = financialReport ? parseFloat(financialReport.profit_margin) : 0;
  const expenseRatio = financialReport ? parseFloat(financialReport.expense_ratio) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-600 mt-1">Track and analyze business expenses</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>


        {/* Month Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Month:</span>
            <input
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">New Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-6 h-6 text-gray-700" />
              <h3 className="text-xl font-semibold text-gray-800">Expense Breakdown by Category</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
                <div key={category} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition">
                  <p className="text-sm font-medium text-gray-700 mb-1">{category}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString()}</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-700 h-2 rounded-full" 
                        style={{width: `${(amount / totalExpenses) * 100}%`}}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((amount / totalExpenses) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800">Expense Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''} for {new Date(selectedDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-gray-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No expenses recorded for this month
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense, idx) => {
                      const categoryLabel = categories.find(c => c.value === expense.category)?.label || expense.category;
                      return (
                        <tr key={expense.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {expense.description || '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-red-600">
                            ₹{parseFloat(expense.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;