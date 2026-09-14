import { cn } from "../../lib/cn";

/* ==========================================================
   EmptyState — shown when a real query returns nothing.
========================================================== */

function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    compact = false,
}) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-400/15 bg-slate-400/[0.03] text-center",
                compact ? "px-5 py-8" : "px-6 py-14",
                className
            )}
        >
            {Icon && (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-inset ring-violet-400/25">
                    <Icon size={24} className="text-violet-300" />
                </div>
            )}

            <h3 className="mt-5 text-lg font-bold text-slate-200">
                {title}
            </h3>

            {description && (
                <p className="mt-2 max-w-md text-sm text-slate-500">
                    {description}
                </p>
            )}

            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

export default EmptyState;
