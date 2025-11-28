interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className = "" }: SkeletonProps) => {
    // Using generic tailwind classes.
    // Adjust 'bg-white/10' to 'bg-gray-200' if you are on a light theme.
    return (
        <div className={`animate-pulse rounded bg-white/10 ${className}`} />
    );
};