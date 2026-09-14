import { CheckCircle2, Loader2, Clock3, XCircle } from "lucide-react";

import { AGENTS, TINTS } from "../../lib/agents";
import { statusMeta } from "../../lib/format";
import { cn } from "../../lib/cn";

/* ==========================================================
   WorkflowTimeline — the six departments and their live
   status straight from the SSE "update" events.
========================================================== */

function StatusIcon({ status }) {
    if (status === "completed") {
        return <CheckCircle2 size={18} className="text-emerald-400" />;
    }

    if (status === "running") {
        return <Loader2 size={18} className="animate-spin text-violet-300" />;
    }

    if (status === "failed") {
        return <XCircle size={18} className="text-red-400" />;
    }

    return <Clock3 size={18} className="text-slate-600" />;
}

function WorkflowTimeline({ statuses = {} }) {
    return (
        <div className="panel p-6">
            <div className="mb-5">
                <h2 className="text-base font-bold text-slate-100">
                    Workflow Timeline
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                    Real-time execution of every AI department
                </p>
            </div>

            <div className="relative space-y-3">
                {AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    const palette = TINTS[agent.tint] || TINTS.violet;
                    const status = statuses[agent.id] || "waiting";
                    const meta = statusMeta(status);
                    const active = status === "running";

                    return (
                        <div
                            key={agent.id}
                            className={cn(
                                "flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300",
                                active
                                    ? "border-violet-400/45 bg-violet-500/[0.08]"
                                    : status === "completed"
                                    ? "border-emerald-400/20 bg-emerald-500/[0.04]"
                                    : "border-slate-400/10 bg-white/[0.02]"
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                                    palette.bg,
                                    palette.ring,
                                    active && "live-dot"
                                )}
                            >
                                <Icon size={19} className={palette.icon} />
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
                                    "hidden shrink-0 text-[11px] font-semibold sm:block",
                                    meta.chip,
                                    "rounded-full px-2.5 py-1"
                                )}
                            >
                                {meta.label}
                            </span>

                            <StatusIcon status={status} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default WorkflowTimeline;
