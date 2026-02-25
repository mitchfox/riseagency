import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for a performance report list */
export const PerformanceListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for the programming/schedule tab */
export const ProgrammingSkeleton = () => (
  <div className="space-y-6">
    {/* Program selector */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-48" />
    </div>
    {/* Schedule grid */}
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
    {/* Sessions */}
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-border/50 rounded-lg p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

/** Skeleton for video / compilation cards */
export const VideoCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-border/50 rounded-lg overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
        <Skeleton className="w-full aspect-video" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for stat cards */
export const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-border/50 rounded-lg p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

/** Generic section skeleton */
export const SectionSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-4/5" />
    <Skeleton className="h-3 w-3/5" />
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  </div>
);
