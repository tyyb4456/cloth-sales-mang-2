// SKELETON SHIMMER COMPONENT
const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);

// Skeleton StatCard Component
export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <SkeletonShimmer className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonShimmer className="h-3 sm:h-4 w-24 sm:w-28" />
            <SkeletonShimmer className="h-6 sm:h-8 lg:h-10 w-32 sm:w-36 lg:w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Summary Card
export function SkeletonSummaryCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="pb-0 px-4 sm:px-6 pt-5 sm:pt-6">
        <SkeletonShimmer className="h-5 sm:h-6 w-40 sm:w-48" />
      </div>
      <div className="pt-3 sm:pt-4 px-4 sm:px-6 pb-5 sm:pb-6 space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center py-1.5 sm:py-2">
          <SkeletonShimmer className="h-4 sm:h-5 w-24 sm:w-28" />
          <SkeletonShimmer className="h-5 sm:h-6 w-16 sm:w-20" />
        </div>
        <div className="flex justify-between items-center py-1.5 sm:py-2">
          <SkeletonShimmer className="h-4 sm:h-5 w-28 sm:w-32" />
          <SkeletonShimmer className="h-5 sm:h-6 w-20 sm:w-24" />
        </div>
      </div>
    </div>
  );
}

// StatCard Component (Real Data)
export function StatCard({ title, value, icon: Icon, color }) {
  return (
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
}