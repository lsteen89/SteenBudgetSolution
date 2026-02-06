import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import { useWizardFinalizationPreviewQuery } from "@/hooks/wizard/useWizardFinalizationPreviewQuery";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";

type Props = {
    children: (preview: BudgetDashboardDto | undefined) => React.ReactNode;
    skeleton?: React.ReactNode;
};

const DefaultSkeleton = () => (
    <div className="p-4">
        <Skeleton className="h-10 w-56 rounded-xl mb-4" />
        <Skeleton className="h-56 w-full rounded-2xl mb-4" />
        <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
);

export function WizardFinalizationPreviewGate({ children, skeleton }: Props) {
    const sessionId = useWizardSessionStore((s) => s.wizardSessionId);
    const query = useWizardFinalizationPreviewQuery(sessionId);
    if (!sessionId) return <>{children(undefined)}</>;

    if (query.isLoading) return <>{skeleton ?? <DefaultSkeleton />}</>;

    if (query.isError || !query.data) return <>{children(undefined)}</>;

    return <>{children(query.data)}</>;
}
