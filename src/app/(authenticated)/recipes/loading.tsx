import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function RecipesLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Skeleton className="mb-6 h-9 w-48" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-full" />
        <div className="flex flex-wrap gap-2">
          {["tag-a", "tag-b", "tag-c", "tag-d", "tag-e", "tag-f"].map((id) => (
            <Skeleton key={id} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"].map((id) => (
            <CardSkeleton key={id} />
          ))}
        </div>
      </div>
    </main>
  );
}
