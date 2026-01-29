// frontend/src/pages/Dashboard.jsx - WITH UNIFIED SKELETON SYSTEM
import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingCart } from 'lucide-react';
import api from '../api/api';

// NEW: Single import from unified skeleton
import { SkeletonStatCard , StatCard} from '../components/skeleton/UnifiedSkeleton'

// Helper to format date
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper function to get item count
const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

export default function Dashboard() {
  const [date, setDate] = useState(formatDate(new Date()));
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
      setError(error.message || 'Failed to load data');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // 📱 ERROR STATE
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center">
        <p className="text-sm sm:text-base text-red-600 dark:text-red-400">Error: {error}</p>
        <button 
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm sm:text-base transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* HEADER - Stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-500">
            Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Daily overview and statistics
          </p>
        </div>
        
        {/* DATE INPUT - Full width on mobile */}
        <div className="w-full sm:w-auto">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* ✅ UPDATED: Simplified skeleton loading */}
      {loading ? (
        <>
          {/* Sales Summary Skeletons */}
          <div className="mb-4 sm:mb-6">
            <div className="h-6 sm:h-7 w-32 sm:w-40 mb-3 sm:mb-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </div>
          </div>

          {/* Summary Card Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-pulse">
              <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {report && report.sales_summary && (
            <>
              {/* SALES SUMMARY - Responsive Grid */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">
                  Sales Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  <StatCard
                    title="Total Sales"
                    value={`Rs ${parseFloat(report.sales_summary.total_sales_amount).toFixed(2)}`}
                    icon={ShoppingCart}
                    color="bg-gray-600 dark:bg-gray-500"
                  />
                  <StatCard
                    title="Total Profit"
                    value={`Rs ${parseFloat(report.sales_summary.total_profit).toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-gray-600 dark:bg-gray-500"
                  />
                  <StatCard
                    title="Items Sold"
                    value={report.sales_summary.total_quantity_sold}
                    icon={Package}
                    color="bg-gray-600 dark:bg-gray-500"
                  />
                </div>
              </div>

              {/* SUMMARY CARDS - Stack on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                  <div className="pb-0 px-4 sm:px-6 pt-5 sm:pt-6">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                      Sales Transactions
                    </h4>
                  </div>
                  <div className="pt-3 sm:pt-4 px-4 sm:px-6 pb-5 sm:pb-6">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                          Total Sales:
                        </span>
                        <span className="text-base sm:text-lg font-bold text-gray-600 dark:text-gray-300">
                          {report.sales_summary.sales_count}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                          Avg Sale Value:
                        </span>
                        <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                          Rs {report.sales_summary.sales_count > 0
                            ? (parseFloat(report.sales_summary.total_sales_amount) / report.sales_summary.sales_count).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* NO DATA STATE */}
          {!report && !loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center py-8 sm:py-12">
              <div className="p-6">
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">
                  No data available for this date
                </p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                  Try selecting a different date or add some transactions
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD SHIMMER ANIMATION */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}