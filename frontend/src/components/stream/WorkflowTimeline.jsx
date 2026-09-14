import { Link } from "react-router-dom";
import { Check, Clock3, Loader2, X } from "lucide-react";

import { AGENTS, TINTS } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   WorkflowTimeline — vertical connector with one node per
   agent, in real graph order.

   Node state comes straight from the SSE statuses map:
     completed → green check · running → pulsing violet dot
     failed → red X          · waiting → grey clock
========================================================== */

const CHIP_BY_STATUS = {
    completed: "chip-ok",
    running: "chip-run",
    failed: "chip-off",
    waiting: "chip-idle",
};

const LABEL_BY_STATUS = {
    completed: "Completed",
    running: "Running",
    failed: "Failed",
    waiting: "Pending",
};

function Node({ status }) {
    if (status === "completed") {
        return (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40">
                <Check size={13} className="text-emerald-400" />
            </span>
        );
    }

    if (status === "running") {
        return <span className="live-dot h-4 w-4 rounded-full bg-violet-500" />;
    }

    if (status === "failed") {
        return (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-inset ring-red-400/40">
                <X size={13} className="text-red-400" />
            </span>
        );
    }

    return <Clock3 size={15} className="text-slate-600" />;
}

function WorkflowTimeline({
    statuses = {},
    durations = {},
    detailsTo,
    title = "Workflow Timeline",
    subtitle = "Real-time execution of every AI department",
}) {
    return (
        <div className="panel p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-100">{title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                </div>

                {detailsTo && (
                    <Link
                        to={detailsTo}
                        className="shrink-0 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                    >
                        View Details →
                    </Link>
                )}
            </div>

            <ol className="grid gap-1">
                {AGENTS.map((agent, index) => {
                    const Icon = agent.icon;
                    const palette = TINTS[agent.tint] || TINTS.violet;
                    const status = statuses[agent.id] || "waiting";
                    const isFirst = index === 0;
                    const isLast = index === AGENTS.length - 1;
                    const active = status === "running";

                    return (
                        <li
                            key={agent.id}
                            className={cn(
                                "grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-2xl transition-colors",
                                active && "bg-violet-500/[0.07]"
                            )}
                        >
                            {/* connector track */}
                            <div className="relative flex justify-center py-4">
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute left-1/2 w-px -translate-x-1/2 bg-[var(--color-line)]",
                                        isFirst && "bottom-0 top-1/2",
                                        isLast && "bottom-1/2 top-0",
                                        !isFirst && !isLast && "inset-y-0"
                                    )}
                                />

                                <span className="relative">
                                    <Node status={status} />
                                </span>
                            </div>

                            {/* row body */}
                            <div className="flex min-w-0 items-center gap-3 py-4">
                                <span
                                    className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                                        palette.bg,
                                        palette.ring,
                                        active && "live-dot"
                                    )}
                                >
                                    <Icon size={17} className={palette.icon} />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-200">
                                        {agent.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {agent.output}
                                    </p>
                                </div>

                                <span
                                    className={cn(
                                        "chip hidden sm:inline-flex",
                                        CHIP_BY_STATUS[status]
                                    )}
                                >
                                    {active && <Loader2 size={11} className="animate-spin" />}
                                    {LABEL_BY_STATUS[status]}
                                </span>

                                <span className="w-14 shrink-0 text-right font-mono text-[11px] text-slate-600">
                                    {durations[agent.id] || "—"}
                                </span>
                            </div>
                        </li>
                    );
                })}

            </ol>
        </div>
    );
}

export default WorkflowTimeline;
