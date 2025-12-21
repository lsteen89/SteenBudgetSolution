import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

const CardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
        {children}
    </div>
);

const KPIItemSkeleton: React.FC = () => (
    <CardShell>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-40" />
        <Skeleton className="mt-2 h-3 w-28" />
    </CardShell>
);

const ListRowSkeleton: React.FC = () => (
    <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-2 w-20" />
        </div>
        <Skeleton className="h-3 w-20" />
    </div>
);

const DashboardHomeSkeleton: React.FC = () => {
    return (
        <div data-testid="dashboard-home-skeleton" className="w-full max-w-6xl space-y-6">
            {/* Header + actions */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                        <Skeleton className="h-7 w-56" />
                        <Skeleton className="mt-2 h-4 w-80" />
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-28 rounded-full" />
                        <Skeleton className="h-10 w-36 rounded-full" />
                    </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KPIItemSkeleton />
                    <KPIItemSkeleton />
                    <KPIItemSkeleton />
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Budget overview */}
                    <CardShell>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-2 h-3 w-72" />

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i}>
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="mt-2 h-4 w-28" />
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between">
                            <Skeleton className="h-3 w-72" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </CardShell>

                    {/* Recurring expenses */}
                    <CardShell>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="mt-2 h-3 w-80" />
                            </div>
                            <Skeleton className="h-6 w-14 rounded-full" />
                        </div>

                        <div className="mt-4 space-y-3">
                            <ListRowSkeleton />
                            <ListRowSkeleton />
                            <ListRowSkeleton />
                            <ListRowSkeleton />
                            <ListRowSkeleton />
                        </div>

                        <Skeleton className="mt-4 h-8 w-44 rounded-full" />
                    </CardShell>

                    {/* Subscriptions */}
                    <CardShell>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="mt-2 h-3 w-56" />
                            </div>
                            <Skeleton className="h-8 w-20 rounded-full" />
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <Skeleton className="h-3 w-40" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Skeleton className="h-3 w-44" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Skeleton className="h-3 w-36" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Skeleton className="h-3 w-48" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    </CardShell>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                    {/* Goals */}
                    <CardShell>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="mt-2 h-3 w-64" />

                        <div className="mt-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-10" />
                            </div>
                            <Skeleton className="mt-2 h-2 w-full rounded-full" />
                        </div>
                    </CardShell>

                    {/* Bird cards */}
                    <CardShell>
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="mt-2 h-3 w-full" />
                        <Skeleton className="mt-2 h-3 w-5/6" />
                        <Skeleton className="mt-4 h-9 w-32 rounded-full" />
                    </CardShell>

                    <CardShell>
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="mt-2 h-3 w-full" />
                        <Skeleton className="mt-2 h-3 w-2/3" />
                        <Skeleton className="mt-4 h-9 w-36 rounded-full" />
                    </CardShell>
                </div>
            </div>
        </div>
    );
};

export default DashboardHomeSkeleton;
