// Skeleton Components
export const SkeletonKPICard = () => (
  <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="h-3 sm:h-4 bg-slate-200 rounded w-20 sm:w-24 mb-2"></div>
        <div className="h-7 sm:h-9 bg-slate-300 rounded w-24 sm:w-32 mb-2"></div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-3 w-3 bg-slate-200 rounded"></div>
          <div className="h-3 bg-slate-200 rounded w-12"></div>
          <div className="h-3 bg-slate-100 rounded w-20"></div>
        </div>
      </div>
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 rounded-lg shrink-0"></div>
    </div>
  </div>
);

export const SkeletonChart = ({ height = 350 }) => (
  <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 animate-pulse">
    <div className="h-5 sm:h-6 bg-slate-200 rounded w-40 sm:w-48 mb-4"></div>
    <div className="space-y-3" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-between h-full gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 bg-slate-100 rounded-t" style={{ height: `${Math.random() * 60 + 40}%` }}></div>
        ))}
      </div>
      <div className="flex justify-between pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-3 bg-slate-100 rounded w-12"></div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonPieChart = () => (
  <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 animate-pulse">
    <div className="h-5 sm:h-6 bg-slate-200 rounded w-40 sm:w-48 mb-4"></div>
    <div className="flex items-center justify-center" style={{ height: '300px' }}>
      <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 rounded-full"></div>
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
    <div className="p-4 sm:p-6 border-b border-gray-200">
      <div className="h-5 sm:h-6 bg-slate-200 rounded w-48"></div>
    </div>
    
    {/* MOBILE: CARD LAYOUT */}
    <div className="block lg:hidden divide-y divide-gray-200">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
            <div className="h-4 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-300 rounded w-20"></div>
            <div className="h-4 bg-slate-200 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>

    {/* DESKTOP: TABLE LAYOUT */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3">
              <div className="h-3 bg-slate-200 rounded w-20"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-3 bg-slate-200 rounded w-16 ml-auto"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-3 bg-slate-200 rounded w-20 ml-auto"></div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-300 rounded w-24 ml-auto"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SkeletonLoader = () => (
  <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
    <div className="max-w-7xl mx-auto">
      
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 animate-pulse">
        <div className="flex-1">
          <div className="h-8 sm:h-9 bg-slate-200 rounded w-56 mb-2"></div>
          <div className="h-4 bg-slate-100 rounded w-72"></div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full sm:w-auto">
          <div className="w-5 h-5 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>

      {/* Revenue vs Expenses Chart Skeleton */}
      <SkeletonChart height={350} />

      {/* Profit & Expense Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 my-4 sm:my-6 md:my-8">
        <SkeletonChart height={300} />
        <SkeletonPieChart />
      </div>

      {/* Monthly Comparison Chart */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <SkeletonChart height={350} />
      </div>

      {/* Table Skeleton */}
      <SkeletonTable />
    </div>
  </div>
);