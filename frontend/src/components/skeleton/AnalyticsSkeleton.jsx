// 🎨 SKELETON SHIMMER COMPONENT
const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);

// 📊 SKELETON KPI CARD
export function SkeletonKPICard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <SkeletonShimmer className="h-3 sm:h-4 w-24 sm:w-28 mb-1" />
          <SkeletonShimmer className="h-8 sm:h-10 lg:h-12 w-32 sm:w-40 mb-1" />
          <SkeletonShimmer className="h-3 sm:h-4 w-20 sm:w-24" />
        </div>
        <SkeletonShimmer className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl shrink-0 ml-2" />
      </div>
      <div className="mt-3 sm:mt-4 flex items-center">
        <SkeletonShimmer className="h-4 w-16 mr-1" />
        <SkeletonShimmer className="h-3 w-32" />
      </div>
    </div>
  );
}

// 📈 SKELETON CHART
export function SkeletonChart({ height = 300 }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
      <SkeletonShimmer className="h-6 sm:h-7 w-40 sm:w-48 mb-4" />
      <div className="space-y-3" style={{ height }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-end gap-2" style={{ height: `${20 * (i + 1)}%` }}>
            <SkeletonShimmer className="flex-1 rounded-t" style={{ height: '100%' }} />
            <SkeletonShimmer className="flex-1 rounded-t" style={{ height: `${80 - i * 10}%` }} />
            <SkeletonShimmer className="flex-1 rounded-t" style={{ height: `${60 + i * 5}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 📊 SKELETON TABLE
export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
        <SkeletonShimmer className="h-6 sm:h-7 w-40 sm:w-48" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-4 sm:px-6 py-3">
                  <SkeletonShimmer className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 sm:px-6 py-3 sm:py-4">
                    <SkeletonShimmer className={`h-5 ${j === 0 ? 'w-32' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}