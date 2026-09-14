import { cn } from "../../lib/cn";

const TONES = {
    violet: {
        icon: "bg-violet-500/10 text-violet-300 ring-violet-400/25",
        accent: "from-violet-500/40",
    },
    cyan: {
        icon: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/25",
        accent: "from-cyan-500/40",
    },
    emerald: {
        icon: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25",
        accent: "from-emerald-500/40",
    },
    amber: {
        icon: "bg-amber-500/10 text-amber-300 ring-amber-400/25",
        accent: "from-amber-500/40",
    },
    slate: {
        icon: "bg-slate-500/10 text-slate-300 ring-slate-400/20",
        accent: "from-slate-500/30",
    },
};

/* ==========================================================
   StatCard — headline metric.
   `value` should always come from real backend data.
========================================================== */

function StatCard({
    title,
    value,
    hint,
    icon: Icon,
    tone = "violet",
    loading = false,
    className,
}) {
    const palette = TONES[tone] || TONES.violet;

    return (
        <div className={cn("panel panel-interactive overflow-hidden p-5", className)}>
            {/* top accent hairline */}
            <div
                className={cn(
                    "absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent",
                    palette.accent
                )}
            />

            <div className="flex items-start justify-between gap-4">
                <p className="eyebrow">{title}</p>

                {Icon && (
                    <span
                        className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                            palette.icon
                        )}
                    >
                        <Icon size={17} />
                    </span>
                )}
            </div>

            {loading ? (
                <div className="skeleton mt-4 h-9 w-20 rounded-lg" />
            ) : (
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-50">
                    {value}
                </p>
            )}

            {hint && (
                <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
            )}
        </div>
    );
}

export default StatCard;
