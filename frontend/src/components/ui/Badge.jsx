import { cn } from "../../lib/cn";
import { statusMeta } from "../../lib/format";

/* ==========================================================
   Badge — status pill driven by the shared status map.
========================================================== */

function Badge({ status = "waiting", label, dot = true, className }) {
    const meta = statusMeta(status);

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                meta.chip,
                className
            )}
        >
            {dot && (
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        meta.dot,
                        status === "running" && "animate-pulse"
                    )}
                />
            )}

            {label || meta.label}
        </span>
    );
}

export default Badge;
