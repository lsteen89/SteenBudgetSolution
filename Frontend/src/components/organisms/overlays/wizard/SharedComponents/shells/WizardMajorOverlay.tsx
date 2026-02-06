// WizardMajorOverlay.tsx
import { cn } from "@/lib/utils";
import WizardSkeleton from "../Skeletons/WizardSkeleton";

export function WizardMajorOverlay({
    open,
    variant = "form",
    rows = 3,
    className,
}: {
    open: boolean;
    variant?: "intro" | "form" | "confirm";
    rows?: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "absolute inset-0 z-50", // IMPORTANT: absolute (box-bound)
                "transition-opacity duration-150",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                className
            )}
        >
            <div className="absolute inset-0 rounded-2xl bg-black/35 backdrop-blur-[2px]" />
            <div className="absolute left-1/2 top-1/2 w-[min(720px,95%)] -translate-x-1/2 -translate-y-1/2">
                <WizardSkeleton variant={variant} withProgress={false} withFooter={false} rows={rows} />
            </div>
        </div>
    );
}
