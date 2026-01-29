// SKELETON SHIMMER COMPONENT
const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);


// MOBILE CARD SKELETON
export function SkeletonMobileCard() {
  return (
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
      
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <SkeletonShimmer className="h-4 w-28" />
          <SkeletonShimmer className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

// DESKTOP TABLE SKELETON
export function SkeletonTableRow() {
  return (
    <tr className="border-t border-gray-200 dark:border-gray-700">
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-5 w-32 sm:w-40" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-6 w-20 sm:w-24 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-4 w-24 sm:w-28" />
      </td>
      <td className="px-6 py-4 text-right">
        <SkeletonShimmer className="h-5 w-20 sm:w-24 ml-auto" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-4 w-32 sm:w-40" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <SkeletonShimmer className="w-9 h-9 rounded-lg" />
          <SkeletonShimmer className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}