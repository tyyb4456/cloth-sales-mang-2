// SKELETON COMPONENTS (kept same as before)
const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);

export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <SkeletonShimmer className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
      </div>
      <SkeletonShimmer className="h-3 sm:h-4 w-20 sm:w-24 mb-1" />
      <SkeletonShimmer className="h-8 sm:h-10 lg:h-12 w-28 sm:w-32 lg:w-36" />
    </div>
  );
}

export function SkeletonMobileCard() {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonShimmer className="h-5 w-32 sm:w-40" />
          <SkeletonShimmer className="h-4 w-24 sm:w-28" />
        </div>
        <SkeletonShimmer className="w-8 h-8 rounded-lg ml-2" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <SkeletonShimmer className="h-3 w-16 mb-1" />
          <SkeletonShimmer className="h-5 w-20" />
        </div>
        <div>
          <SkeletonShimmer className="h-3 w-20 mb-1" />
          <SkeletonShimmer className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-t border-gray-200 dark:border-gray-700">
      <td className="px-6 py-4"><SkeletonShimmer className="h-5 w-28 sm:w-32" /></td>
      <td className="px-6 py-4"><SkeletonShimmer className="h-5 w-32 sm:w-36" /></td>
      <td className="px-6 py-4 text-center"><SkeletonShimmer className="h-6 w-16 rounded-full mx-auto" /></td>
      <td className="px-6 py-4 text-center"><SkeletonShimmer className="h-5 w-16 mx-auto" /></td>
      <td className="px-6 py-4 text-right"><SkeletonShimmer className="h-5 w-24 ml-auto" /></td>
      <td className="px-6 py-4 text-right"><SkeletonShimmer className="h-5 w-20 ml-auto" /></td>
      <td className="px-6 py-4 text-center"><SkeletonShimmer className="h-4 w-16 mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><SkeletonShimmer className="w-9 h-9 rounded-lg" /><SkeletonShimmer className="w-9 h-9 rounded-lg" /></div></td>
    </tr>
  );
}
