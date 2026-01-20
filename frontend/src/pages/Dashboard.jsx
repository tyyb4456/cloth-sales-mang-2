// frontend/src/pages/Dashboard.jsx - FIXED
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardBody, CardHeader, Input, Spinner } from '@heroui/react';
import api from '../api/api'; // ✅ USE THE CONFIGURED API

// Helper function to get item count
const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardBody className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl ${color} shrink-0`}>
            <Icon size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-serif text-gray-500">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, [date]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ FIXED: Use configured API instead of hardcoded localhost
      const [reportRes, salesRes, varietiesRes] = await Promise.all([
        api.get(`/reports/daily/${date}`),
        api.get(`/sales/date/${date}`),
        api.get('/varieties/')
      ]);

      const reportData = reportRes.data;
      const salesData = salesRes.data;
      const varietiesData = varietiesRes.data;

      // Create variety map
      const varietyMap = {};
      if (Array.isArray(varietiesData)) {
        varietiesData.forEach(v => {
          varietyMap[v.id] = v;
        });
      }

      // Calculate correct items sold using getItemCount
      const correctItemCount = Array.isArray(salesData) 
        ? salesData.reduce((sum, sale) => {
            const variety = varietyMap[sale.variety_id];
            return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
          }, 0)
        : 0;

      // Override the backend's total_quantity_sold with corrected value
      if (reportData.sales_summary) {
        reportData.sales_summary.total_quantity_sold = correctItemCount;
      }

      setReport(reportData);
    } catch (error) {
      console.error('Error loading report:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to load data');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto min-w-50"
          variant="bordered"
          color="default"
        />
      </div>

      {report && report.sales_summary && (
        <>
          {/* Sales Summary */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Sales Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Sales"
                value={`Rs ${parseFloat(report.sales_summary.total_sales_amount).toFixed(2)}`}
                icon={ShoppingCart}
                color="bg-gray-600"
              />
              <StatCard
                title="Total Profit"
                value={`Rs ${parseFloat(report.sales_summary.total_profit).toFixed(2)}`}
                icon={TrendingUp}
                color="bg-gray-600"
              />
              <StatCard
                title="Items Sold"
                value={report.sales_summary.total_quantity_sold}
                icon={Package}
                color="bg-gray-600"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-0">
                <h4 className="text-lg font-semibold text-gray-800">Sales Transactions</h4>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Total Sales:</span>
                    <span className="font-bold text-lg text-gray-600">{report.sales_summary.sales_count}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Avg Sale Value:</span>
                    <span className="font-bold text-lg text-gray-800">
                      Rs {report.sales_summary.sales_count > 0
                        ? (parseFloat(report.sales_summary.total_sales_amount) / report.sales_summary.sales_count).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-2">No data available for this date</p>
          <p className="text-sm text-gray-400">Try selecting a different date or add some transactions</p>
        </div>
      )}
    </div>
  );
}