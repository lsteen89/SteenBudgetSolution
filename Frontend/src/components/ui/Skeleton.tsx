import { cn } from "@/lib/utils";

type SkeletonProps = { className?: string };

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "rounded-md bg-white/10",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                className
            )}
        />
    );
}
