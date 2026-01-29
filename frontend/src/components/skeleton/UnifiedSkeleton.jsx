// ============================================
// UNIFIED SKELETON SYSTEM
// ============================================
// Reusable across: Dashboard, Analytics, Sales, Inventory, Varieties, Returns, Financial

// ============================================
// BASE SHIMMER COMPONENT
// ============================================
export const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);

// ============================================
// STAT/KPI CARD SKELETON (Universal)
// ============================================
// Used in: Dashboard, Analytics, Sales, Inventory, Returns, Financial
export const SkeletonStatCard = ({ showTrend = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonShimmer className="h-3 sm:h-4 w-20 sm:w-24" />
        <SkeletonShimmer className="h-8 sm:h-10 lg:h-12 w-28 sm:w-32 lg:w-36" />
        <SkeletonShimmer className="h-3 sm:h-4 w-16 sm:w-20" />
      </div>
      <SkeletonShimmer className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl shrink-0 ml-2" />
    </div>
    {showTrend && (
      <div className="mt-3 sm:mt-4 flex items-center">
        <SkeletonShimmer className="h-4 w-12 mr-1" />
        <SkeletonShimmer className="h-3 w-24" />
      </div>
    )}
  </div>
);

// ============================================
// TABLE COMPONENTS (Universal)
// ============================================

// Desktop Table Row Skeleton
export const SkeletonTableRow = ({ columns = 6 }) => (
  <tr className="border-t border-gray-200 dark:border-gray-700">
    {[...Array(columns)].map((_, i) => (
      <td key={i} className="px-4 sm:px-6 py-3 sm:py-4">
        <SkeletonShimmer className={`h-4 sm:h-5 ${i === 0 ? 'w-32' : i === columns - 1 ? 'w-16' : 'w-20'}`} />
      </td>
    ))}
  </tr>
);

// Mobile Card Skeleton (for tables on mobile)
export const SkeletonMobileCard = () => (
  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonShimmer className="h-5 w-32 sm:w-40" />
        <SkeletonShimmer className="h-4 w-20 sm:w-24" />
      </div>
      <div className="flex items-center gap-1 ml-2">
        <SkeletonShimmer className="w-8 h-8 rounded-lg" />
        <SkeletonShimmer className="w-8 h-8 rounded-lg" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <SkeletonShimmer className="h-3 w-16 mb-1" />
          <SkeletonShimmer className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

// Full Table Skeleton (with header)
export const SkeletonTable = ({ 
  rows = 5, 
  columns = 6,
  showMobileCards = true,
  headers = [] 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    {/* Header */}
    <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
      <SkeletonShimmer className="h-5 sm:h-6 w-40 sm:w-48" />
    </div>
    
    {/* Mobile Cards */}
    {showMobileCards && (
      <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {[...Array(rows)].map((_, i) => (
          <SkeletonMobileCard key={i} />
        ))}
      </div>
    )}

    {/* Desktop Table */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 sm:px-6 py-3">
                <SkeletonShimmer className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(rows)].map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ============================================
// CHART SKELETONS
// ============================================

// Line/Bar Chart Skeleton
export const SkeletonChart = ({ 
  height = 300,
  showTitle = true,
  showLegend = false 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
    {showTitle && <SkeletonShimmer className="h-6 sm:h-7 w-40 sm:w-48 mb-4" />}
    
    <div className="space-y-3" style={{ height: `${height}px` }}>
      {/* Y-axis labels */}
      <div className="flex items-end gap-2 h-full">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="flex-1 flex flex-col justify-end gap-1"
          >
            {/* Bar/Line */}
            <SkeletonShimmer 
              className="w-full rounded-t" 
              style={{ height: `${Math.random() * 60 + 40}%` }} 
            />
            {/* X-axis label */}
            <SkeletonShimmer className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
    
    {showLegend && (
      <div className="flex gap-4 mt-4 justify-center">
        <SkeletonShimmer className="h-4 w-20" />
        <SkeletonShimmer className="h-4 w-20" />
      </div>
    )}
  </div>
);

// Pie Chart Skeleton
export const SkeletonPieChart = ({ showTitle = true }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
    {showTitle && <SkeletonShimmer className="h-6 sm:h-7 w-40 sm:w-48 mb-4" />}
    <div className="flex items-center justify-center" style={{ height: '300px' }}>
      <SkeletonShimmer className="w-48 h-48 sm:w-56 sm:h-56 rounded-full" />
    </div>
  </div>
);

// ============================================
// SPECIAL SKELETONS
// ============================================

// Daily Card (for Inventory page)
export const SkeletonDailyCard = () => (
  <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
    <SkeletonShimmer className="h-3 w-1/2 mb-2" />
    <SkeletonShimmer className="h-5 w-3/4 mb-2" />
    <SkeletonShimmer className="h-3 w-2/3 mb-2" />
    <SkeletonShimmer className="h-3 w-1/2" />
  </div>
);

// Supplier/Group Card Skeleton (for Returns, Inventory)
export const SkeletonGroupCard = ({ rows = 3 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex-1">
          <SkeletonShimmer className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2" />
          <SkeletonShimmer className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
        </div>
        <div>
          <SkeletonShimmer className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2" />
          <SkeletonShimmer className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-24" />
        </div>
      </div>
    </div>

    {/* Mobile Cards */}
    <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
      {[...Array(rows)].map((_, i) => (
        <SkeletonMobileCard key={i} />
      ))}
    </div>

    {/* Desktop Table */}
    <div className="hidden lg:block overflow-x-auto p-4">
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <SkeletonShimmer key={i} className="h-12 rounded" />
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// FULL PAGE LOADERS
// ============================================

export const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
    <div className="p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`p-3 sm:p-3.5 lg:p-4 rounded-xl ${color} shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-serif text-gray-500 dark:text-gray-300 truncate">
            {value}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Dashboard Page Loader
export const SkeletonDashboard = () => (
  <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    {/* Header */}
    <div className="mb-4 sm:mb-6">
      <SkeletonShimmer className="h-8 w-48 mb-2" />
      <SkeletonShimmer className="h-4 w-64" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>

    {/* Summary Card */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <SkeletonShimmer className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <SkeletonShimmer className="h-5 w-full" />
          <SkeletonShimmer className="h-5 w-full" />
        </div>
      </div>
    </div>
  </div>
);

// Analytics Page Loader
export const SkeletonAnalytics = () => (
  <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    {/* Header with controls */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <SkeletonShimmer className="h-8 w-48 mb-2" />
        <SkeletonShimmer className="h-4 w-64" />
      </div>
      <SkeletonShimmer className="h-10 w-32" />
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
      <SkeletonStatCard showTrend />
      <SkeletonStatCard showTrend />
      <SkeletonStatCard showTrend />
      <SkeletonStatCard showTrend />
    </div>

    {/* Chart */}
    <SkeletonChart height={350} showTitle showLegend />

    {/* Table */}
    <div className="mt-6">
      <SkeletonTable rows={5} columns={6} />
    </div>
  </div>
);

// Financial Dashboard Loader
export const SkeletonFinancial = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <SkeletonShimmer className="h-8 w-56 mb-2" />
          <SkeletonShimmer className="h-4 w-72" />
        </div>
        <SkeletonShimmer className="h-10 w-40" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <SkeletonStatCard showTrend />
        <SkeletonStatCard showTrend />
        <SkeletonStatCard showTrend />
        <SkeletonStatCard showTrend />
      </div>

      {/* Revenue Chart */}
      <SkeletonChart height={350} showTitle showLegend />

      {/* Profit & Expense Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 my-6">
        <SkeletonChart height={300} showTitle />
        <SkeletonPieChart showTitle />
      </div>

      {/* Comparison Chart */}
      <SkeletonChart height={350} showTitle showLegend />

      {/* Table */}
      <div className="mt-6">
        <SkeletonTable rows={5} columns={3} />
      </div>
    </div>
  </div>
);

// Generic List Page Loader (Varieties, Sales, etc.)
export const SkeletonListPage = ({ 
  title = "Loading...",
  hasStats = false,
  statCount = 3 
}) => (
  <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <div>
        <SkeletonShimmer className="h-8 w-48 mb-2" />
        <SkeletonShimmer className="h-4 w-64" />
      </div>
      <SkeletonShimmer className="h-10 w-32" />
    </div>

    {/* Stats (optional) */}
    {hasStats && (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${statCount} gap-3 sm:gap-4 lg:gap-6 mb-6`}>
        {[...Array(statCount)].map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
    )}

    {/* Table */}
    <SkeletonTable rows={5} columns={6} />
  </div>
);

// ============================================
// ANIMATION STYLES (Add to your index.css)
// ============================================
/*
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
*/