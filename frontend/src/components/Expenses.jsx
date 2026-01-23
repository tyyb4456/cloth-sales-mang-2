// frontend/src/components/Expenses.jsx - MOBILE-FIRST RESPONSIVE VERSION

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, TrendingDown, DollarSign, AlertCircle, PieChart, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/api';
import { format } from 'date-fns';

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
      const response = await api.get(`/expenses/month/${parseInt(year)}/${parseInt(month)}`);
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
      await api.post('/expenses/', {
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
      await api.delete(`/expenses/${id}`);
      loadExpenses();
      loadFinancialReport();
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const changeMonth = (direction) => {
    const [year, month] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + direction);
    setSelectedDate(format(date, 'yyyy-MM'));
  };

  const goToCurrentMonth = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM'));
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

  const isCurrentMonth = selectedDate === format(new Date(), 'yyyy-MM');
  const monthName = new Date(selectedDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* MOBILE-FIRST HEADER */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track and analyze business expenses</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm sm:text-base shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* MOBILE-FIRST MONTH NAVIGATOR */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg transition active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="text-center flex-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                {monthName}
              </h3>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 mt-1 hover:underline"
                >
                  Go to Current Month
                </button>
              )}
            </div>
            
            <button
              onClick={() => changeMonth(1)}
              className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg transition active:scale-95"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* MOBILE-FIRST FINANCIAL SUMMARY CARDS */}
        {financialReport && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                <p className="text-xs font-medium text-gray-600">Revenue</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{(totalRevenue / 1000).toFixed(1)}K</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                <p className="text-xs font-medium text-gray-600">Profit</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-700">₹{(totalProfit / 1000).toFixed(1)}K</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                <p className="text-xs font-medium text-gray-600">Expenses</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-red-700">₹{(totalExpenses / 1000).toFixed(1)}K</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 shrink-0" />
                <p className="text-xs font-medium text-gray-600">Net Income</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">₹{(netIncome / 1000).toFixed(1)}K</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 shrink-0" />
                <p className="text-xs font-medium text-gray-600">Profit Margin</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-orange-700">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* MOBILE-FIRST ADD EXPENSE FORM */}
        {showForm && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">New Expense</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition lg:hidden"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm sm:text-base active:scale-95"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm sm:text-base active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE-FIRST CATEGORY BREAKDOWN */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Expense Breakdown by Category</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
                <div key={category} className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition">
                  <p className="text-sm font-medium text-gray-700 mb-1">{category}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{amount.toLocaleString()}</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-700 h-2 rounded-full transition-all duration-500" 
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

        {/* MOBILE-FIRST EXPENSES TABLE */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Expense Records</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''} for {monthName}
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8 sm:py-10">
              <Loader2 className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <AlertCircle size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No expenses recorded for this month</p>
            </div>
          ) : (
            <>
              {/* MOBILE: CARD LAYOUT */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {expenses.map((expense) => {
                  const categoryLabel = categories.find(c => c.value === expense.category)?.label || expense.category;
                  return (
                    <div key={expense.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                              {categoryLabel}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 active:scale-95"
                          aria-label="Delete expense"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      {expense.description && (
                        <p className="text-sm text-gray-600 mb-2 wrap-break-word">{expense.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Amount:</span>
                        <span className="text-lg font-semibold text-red-600">₹{parseFloat(expense.amount).toLocaleString()}</span>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((expense, idx) => {
                      const categoryLabel = categories.find(c => c.value === expense.category)?.label || expense.category;
                      return (
                        <tr key={expense.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
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
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;