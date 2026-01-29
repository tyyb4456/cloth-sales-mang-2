// SKELETON COMPONENTS
export const SkeletonStatCard = () => (
  <div className="bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-lg animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
    </div>
    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
    <div className="h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
  </div>
);

export const SkeletonDailyCard = () => (
  <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

export const SkeletonMonthlyCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
  </div>
);

export const SkeletonSupplierCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
    <div className="bg-gray-100 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex-1">
          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
        </div>
        <div className="text-left sm:text-right">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
      </div>
    </div>

    {/* Mobile Card View Skeleton */}
    <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg ml-2"></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j}>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Desktop Table View Skeleton */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);