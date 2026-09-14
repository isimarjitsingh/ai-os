import { cn } from "../../lib/cn";

/* ==========================================================
   Skeleton / Spinner loading affordances
========================================================== */

export function Skeleton({ className }) {
    return <div className={cn("skeleton rounded-xl", className)} />;
}

export function Spinner({ size = 20, className }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn(
                "inline-block animate-spin rounded-full border-2 border-slate-600 border-t-violet-400",
                className
            )}
            style={{ width: size, height: size }}
        />
    );
}

/* Card-shaped placeholder grid */
export function SkeletonCards({ count = 6, className }) {
    return (
        <div className={cn("space-y-4", className)}>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
            ))}
        </div>
    );
}

export default Skeleton;
