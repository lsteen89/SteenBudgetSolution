import { Skeleton } from "@components/ui/Skeleton";

export const BudgetGuideSkeleton = () => {
  return (
    <div className="w-full space-y-4 rounded-xl bg-white/5 p-6 backdrop-blur-sm">
      {/* Header imitation */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-1/3" /> {/* Title */}
        <Skeleton className="h-8 w-8 rounded-full" /> {/* Icon/Action */}
      </div>

      {/* Content imitation - e.g. a chart or list */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* A larger block (like a summary card) */}
      <Skeleton className="mt-6 h-32 w-full rounded-lg" />
    </div>
  );
};