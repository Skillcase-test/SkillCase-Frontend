export function EventCardSkeleton({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm animate-pulse">
        <div className="flex-shrink-0 w-16 h-12 bg-gray-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="flex-shrink-0 w-20 h-14 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-8">
          {/* Left Column Skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-[400px] bg-gray-200 rounded-2xl" />
            <div className="bg-white rounded-xl p-6 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-40" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-3/4" />
            <div className="bg-white rounded-xl p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>

            <div className="h-14 bg-gray-200 rounded-xl" />

            <div className="bg-white rounded-xl p-6 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
      <div className="flex gap-2 mb-4">
        <div className="h-10 bg-gray-200 rounded-lg flex-1" />
        <div className="h-10 bg-gray-200 rounded-lg flex-1" />
      </div>
      <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-4" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="w-10 h-10 bg-gray-200 rounded-full" />
        ))}
      </div>
    </div>
  );
}
