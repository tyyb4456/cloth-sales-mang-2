// frontend/src/components/CustomerLoanDashboard.jsx - MOBILE-FIRST RESPONSIVE VERSION

import { useState, useEffect } from 'react';
import {
  Search, Calendar, DollarSign, Users,
  AlertCircle, CheckCircle, Clock,
  TrendingUp, FileText, Phone, Plus, X
} from 'lucide-react';
import api from '../api/api';

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

export default function CustomerLoanDashboard() {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customerSummaries, setCustomerSummaries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loansRes, summaryRes, customerSummaryRes] = await Promise.all([
        api.get(`/loans/${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`),
        api.get('/loans/summary/status'),
        api.get('/loans/summary/customers')
      ]);

      const loansData = loansRes.data;
      const summaryData = summaryRes.data;
      const customerSummaryData = customerSummaryRes.data;

      setLoans(Array.isArray(loansData) ? loansData : []);
      setSummary(summaryData);
      setCustomerSummaries(Array.isArray(customerSummaryData) ? customerSummaryData : []);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadData();
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/loans/search/${searchTerm}`);
      const data = response.data;
      setLoans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching loans:', error);
      alert('Customer not found');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedLoan || !paymentAmount) {
      alert('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > parseFloat(selectedLoan.amount_remaining)) {
      alert('Invalid payment amount');
      return;
    }

    try {
      const response = await api.post(`/loans/${selectedLoan.id}/payments`, {
        payment_amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        notes: paymentNotes
      });

      if (response.status === 200 || response.status === 201) {
        alert('Payment recorded successfully!');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        setSelectedLoan(null);
        loadData();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleDeleteLoan = async (loan) => {
    const confirmMsg = `WARNING: This will permanently delete:

- Loan for customer: ${loan.customer_name}
- Loan amount: ₹${parseFloat(loan.total_loan_amount).toLocaleString()}
- All payment history
- Associated sale record

This action CANNOT be undone!

Are you sure you want to delete this loan?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.delete(`/loans/${loan.id}`);

      if (response.status === 200 || response.status === 204) {
        alert('Loan deleted successfully!');
        loadData();
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert(error.response?.data?.detail || 'Failed to delete loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green-600" />;
      case 'partial': return <Clock size={16} className="text-yellow-600" />;
      case 'pending': return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  if (loading && loans.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* MOBILE-FIRST HEADER */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Customer Loan Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage customer credit accounts</p>
        </div>

        {/* MOBILE-FIRST SUMMARY CARDS */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Loans</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">
                {summary.overall.total_loans}
              </h3>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Loaned</p>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mt-1">
                ₹{(summary.overall.total_loan_amount / 1000).toFixed(1)}K
              </h3>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Collected</p>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700 mt-1">
                ₹{(summary.overall.total_paid / 1000).toFixed(1)}K
              </h3>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Outstanding</p>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-700 mt-1">
                ₹{(summary.overall.total_outstanding / 1000).toFixed(1)}K
              </h3>
            </div>
          </div>
        )}

        {/* MOBILE-FIRST SEARCH & FILTER */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by customer name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm sm:text-base active:scale-95"
              >
                Search
              </button>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'partial', 'paid'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition text-sm sm:text-base active:scale-95 ${
                    filterStatus === status
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MOBILE-FIRST LOANS LIST */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Active Loans</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Showing {loans.length} loan records</p>
          </div>

          {/* MOBILE: CARD LAYOUT */}
          <div className="block lg:hidden divide-y divide-gray-200">
            {loans.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Users size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">No loans found</p>
              </div>
            ) : (
              loans.map((loan) => (
                <div key={loan.id} className="p-4 hover:bg-gray-50 transition">
                  {/* Customer Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-base truncate">{loan.customer_name}</div>
                      {loan.customer_phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Phone size={12} />
                          <span>{loan.customer_phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(loan.loan_date)}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 ml-2">
                      {getStatusIcon(loan.loan_status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.loan_status)}`}>
                        {loan.loan_status.charAt(0).toUpperCase() + loan.loan_status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Loan Amounts */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Total</p>
                      <p className="font-semibold text-gray-900">₹{parseFloat(loan.total_loan_amount).toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Paid</p>
                      <p className="font-semibold text-green-700">₹{parseFloat(loan.amount_paid).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Remaining</p>
                      <p className="font-semibold text-red-700">₹{parseFloat(loan.amount_remaining).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {loan.loan_status !== 'paid' && (
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowPaymentModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium active:scale-95"
                      >
                        Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteLoan(loan)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium active:scale-95 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP: TABLE LAYOUT */}
          <div className="hidden lg:block overflow-x-auto">
            {loans.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-base">No loans found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Loan Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Remaining</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loans.map((loan, idx) => (
                    <tr key={loan.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{loan.customer_name}</div>
                          {loan.customer_phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Phone size={12} />
                              {loan.customer_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {formatDate(loan.loan_date)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{parseFloat(loan.total_loan_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        ₹{parseFloat(loan.amount_paid).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        ₹{parseFloat(loan.amount_remaining).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(loan.loan_status)}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.loan_status)}`}>
                            {loan.loan_status.charAt(0).toUpperCase() + loan.loan_status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {loan.loan_status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedLoan(loan);
                                setShowPaymentModal(true);
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLoan(loan)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MOBILE-FIRST CUSTOMER SUMMARIES */}
        {customerSummaries.length > 0 && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Customer Summary</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Aggregated loan data per customer</p>
            </div>

            {/* MOBILE: CARD LAYOUT */}
            <div className="block lg:hidden divide-y divide-gray-200">
              {customerSummaries.map((customer, idx) => (
                <div key={idx} className="p-4">
                  <div className="font-medium text-gray-900 mb-3">{customer.customer_name}</div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Total Loans</p>
                      <p className="font-semibold text-gray-900">{customer.total_loans}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Total Loaned</p>
                      <p className="font-semibold text-gray-900">₹{parseFloat(customer.total_loan_amount).toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Paid</p>
                      <p className="font-semibold text-green-600">₹{parseFloat(customer.total_paid).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-gray-500 mb-0.5">Outstanding</p>
                      <p className="font-semibold text-red-600">₹{parseFloat(customer.total_remaining).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: TABLE LAYOUT */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Total Loans</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Loaned</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customerSummaries.map((customer, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                      <td className="px-6 py-4 font-medium text-gray-900">{customer.customer_name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {customer.total_loans}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{parseFloat(customer.total_loan_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        ₹{parseFloat(customer.total_paid).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        ₹{parseFloat(customer.total_remaining).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MOBILE-FIRST PAYMENT MODAL */}
        {showPaymentModal && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Record Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedLoan(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Customer: <span className="font-medium text-gray-900">{selectedLoan.customer_name}</span></p>
                <p className="text-sm text-gray-600">Remaining: <span className="font-bold text-red-600">₹{parseFloat(selectedLoan.amount_remaining).toLocaleString()}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={selectedLoan.amount_remaining}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows="2"
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleRecordPayment}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm sm:text-base active:scale-95"
                  >
                    Record Payment
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedLoan(null);
                      setPaymentAmount('');
                      setPaymentNotes('');
                    }}
                    className="px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm sm:text-base active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}