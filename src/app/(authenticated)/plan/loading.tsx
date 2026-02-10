import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <Skeleton key={`skeleton-${i}`} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto lg:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <Skeleton key={`mobile-skeleton-${i}`} className="h-48 min-w-[280px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
