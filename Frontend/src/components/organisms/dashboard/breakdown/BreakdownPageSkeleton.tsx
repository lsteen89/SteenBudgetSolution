import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

const BreakdownCardSkeleton: React.FC = () => (
    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
        <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="mt-4 h-8 w-28 rounded-full" />
    </div>
);

const BreakdownHeaderSkeleton: React.FC = () => (
    <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
    </div>
);

const BreakdownPageSkeleton: React.FC = () => {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
            <BreakdownHeaderSkeleton />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <BreakdownCardSkeleton />
                    <BreakdownCardSkeleton />
                </div>
                <div className="space-y-4">
                    <BreakdownCardSkeleton />
                    <BreakdownCardSkeleton />
                </div>
            </div>
        </div>
    );
};

export default BreakdownPageSkeleton;
