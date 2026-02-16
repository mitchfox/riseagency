import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showAvatar?: boolean;
}

export const TableSkeleton = ({ rows = 5, columns = 4, showAvatar = true }: TableSkeletonProps) => {
  return (
    <div className="w-full space-y-3">
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b border-border/50">
        {showAvatar && <div className="w-10" />}
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" style={{ maxWidth: i === 0 ? '30%' : '20%' }} />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-2">
          {showAvatar && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
              style={{
                maxWidth: colIndex === 0 ? `${55 + Math.random() * 20}%` : `${30 + Math.random() * 30}%`,
                animationDelay: `${(rowIndex * columns + colIndex) * 75}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border border-border/50 rounded-lg space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
