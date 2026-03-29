function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 animate-pulse">
      {/* Title */}
      <div className="h-4 w-3/4 rounded-full bg-gray-100" />
      <div className="mt-2 h-4 w-1/2 rounded-full bg-gray-100" />

      {/* Authors */}
      <div className="mt-3 h-3 w-2/5 rounded-full bg-gray-100" />

      {/* Abstract lines */}
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded-full bg-gray-100" />
        <div className="h-3 w-full rounded-full bg-gray-100" />
        <div className="h-3 w-4/5 rounded-full bg-gray-100" />
      </div>

      {/* Footer row */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-5 w-10 rounded-full bg-gray-100" />
        <div className="h-3 w-28 rounded-full bg-gray-100" />
        <div className="ml-auto flex gap-2">
          <div className="h-7 w-7 rounded-full bg-gray-100" />
          <div className="h-7 w-16 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function FeedLoading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Feed</h1>
      </div>

      {/* Tab switcher skeleton */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <div className="h-7 w-16 rounded-lg bg-white shadow-sm" />
        <div className="h-7 w-24 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
