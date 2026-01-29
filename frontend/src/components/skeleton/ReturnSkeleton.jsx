// Skeleton Components
export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-700 shadow-sm animate-pulse">
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className="flex-1">
        <div className="h-3 sm:h-4 bg-slate-200 dark:bg-gray-700 rounded w-20 sm:w-24 mb-2"></div>
        <div className="h-6 sm:h-8 bg-slate-300 dark:bg-gray-600 rounded w-12 sm:w-16"></div>
      </div>
      <div className="p-2 sm:p-3 bg-slate-100 dark:bg-gray-700 rounded-lg">
        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-200 dark:bg-gray-600 rounded"></div>
      </div>
    </div>
    <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-24 sm:w-32"></div>
  </div>
);

export const SkeletonReturnCard = () => (
  <div className="p-4 border-b border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
        <div className="h-3 bg-slate-100 dark:bg-gray-600 rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="h-3 bg-slate-100 dark:bg-gray-600 rounded w-12 mb-1"></div>
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
      <div>
        <div className="h-3 bg-slate-100 dark:bg-gray-600 rounded w-16 mb-1"></div>
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-12"></div>
      </div>
      <div>
        <div className="h-3 bg-slate-100 dark:bg-gray-600 rounded w-20 mb-1"></div>
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      <div>
        <div className="h-3 bg-slate-100 dark:bg-gray-600 rounded w-12 mb-1"></div>
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export const SkeletonReturnGroup = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
    <div className="bg-red-50 dark:bg-red-900/20 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex-1">
          <div className="h-5 bg-slate-300 dark:bg-gray-600 rounded w-32 sm:w-40 mb-2"></div>
          <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <div>
          <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
          <div className="h-6 bg-slate-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
      </div>
    </div>
    
    <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
      <SkeletonReturnCard />
      <SkeletonReturnCard />
      <SkeletonReturnCard />
    </div>
    
    <div className="hidden lg:block overflow-x-auto p-4">
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex-1 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-100 dark:bg-gray-800 rounded w-64"></div>
          </div>
          <div className="w-full sm:w-auto h-10 bg-slate-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6 animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex-1 text-center">
            <div className="h-6 bg-slate-200 dark:bg-gray-700 rounded w-40 mx-auto"></div>
          </div>
          <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <div className="sm:col-span-2 lg:col-span-1">
          <SkeletonCard />
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <SkeletonReturnGroup />
        <SkeletonReturnGroup />
      </div>
    </div>
  </div>
);
