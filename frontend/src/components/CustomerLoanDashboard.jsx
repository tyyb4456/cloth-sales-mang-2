import { useState, useEffect } from 'react';
import {
  Search, Calendar, DollarSign, Users,
  AlertCircle, CheckCircle, Clock,
  TrendingUp, FileText, Phone, Plus
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

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
        fetch(`${API_BASE_URL}/loans/${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`),
        fetch(`${API_BASE_URL}/loans/summary/status`),
        fetch(`${API_BASE_URL}/loans/summary/customers`)
      ]);

      const loansData = await loansRes.json();
      const summaryData = await summaryRes.json();
      const customerSummaryData = await customerSummaryRes.json();

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
      const response = await fetch(`${API_BASE_URL}/loans/search/${searchTerm}`);
      const data = await response.json();
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
      const response = await fetch(`${API_BASE_URL}/loans/${selectedLoan.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_amount: amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });

      if (response.ok) {
        alert('Payment recorded successfully!');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        setSelectedLoan(null);
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }
  const handleDeleteLoan = async (loan) => {
    const confirmMsg = `⚠️ WARNING: This will permanently delete:

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
      const response = await fetch(`${API_BASE_URL}/loans/${loan.id}`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('✅ Loan deleted successfully!');
        loadData(); // Reload all data
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete loan');
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('❌ Failed to delete loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Customer Loan Management</h2>
          <p className="text-gray-600 mt-1">Track and manage customer credit accounts</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Loans</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">
                    {summary.overall.total_loans}
                  </h3>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Loaned</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">
                    ₹{(summary.overall.total_loan_amount / 1000).toFixed(0)}K
                  </h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Collected</p>
                  <h3 className="text-3xl font-bold text-green-700 mt-1">
                    ₹{(summary.overall.total_paid / 1000).toFixed(0)}K
                  </h3>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <h3 className="text-3xl font-bold text-red-700 mt-1">
                    ₹{(summary.overall.total_outstanding / 1000).toFixed(0)}K
                  </h3>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by customer name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Search
            </button>

            <div className="flex gap-2">
              {['all', 'pending', 'partial', 'paid'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === status
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

        {/* Loans Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">Active Loans</h3>
            <p className="text-sm text-gray-600 mt-1">Showing {loans.length} loan records</p>
          </div>

          <div className="overflow-x-auto">
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
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No loans found
                    </td>
                  </tr>
                ) : (
                  loans.map((loan, idx) => (
                    <tr key={loan.id} className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
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

                          {/* 🆕 ADD DELETE BUTTON */}
                          <button
                            onClick={() => handleDeleteLoan(loan)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Summaries */}
        {customerSummaries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Customer Summary</h3>
              <p className="text-sm text-gray-600 mt-1">Aggregated loan data per customer</p>
            </div>

            <div className="overflow-x-auto">
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
                    <tr key={idx} className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
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

        {/* Payment Modal */}
        {showPaymentModal && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Record Payment</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Customer: <span className="font-medium text-gray-900">{selectedLoan.customer_name}</span></p>
                <p className="text-sm text-gray-600">Remaining: <span className="font-bold text-red-600">₹{parseFloat(selectedLoan.amount_remaining).toLocaleString()}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={selectedLoan.amount_remaining}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleRecordPayment}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
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