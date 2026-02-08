import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipeDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      <Separator />

      {/* Image + Meta skeleton */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <Skeleton className="mb-3 h-6 w-32" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Macros skeleton */}
      <div className="mb-3">
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <Separator className="my-6" />

      {/* Ingredients skeleton */}
      <div className="mb-3">
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="divide-y">
        <div className="py-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-1 h-3 w-48" />
        </div>
        <div className="py-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-1 h-3 w-44" />
        </div>
        <div className="py-3">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="mt-1 h-3 w-40" />
        </div>
        <div className="py-3">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="mt-1 h-3 w-48" />
        </div>
        <div className="py-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-1 h-3 w-44" />
        </div>
        <div className="py-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1 h-3 w-40" />
        </div>
      </div>
    </div>
  );
}
