import { CheckCircle2, Loader2, XCircle, TerminalSquare } from "lucide-react";

import { getAgent, TINTS } from "../../lib/agents";
import { formatTime } from "../../lib/format";
import { cn } from "../../lib/cn";

/* ==========================================================
   ActivityFeed — renders the real SSE payload:
       { agent, status, output, receivedAt, label }

   NOTE: the backend does NOT send `message` or `time`.
   `label` is derived from `output` in useGeneration, and the
   timestamp is captured client-side in `receivedAt`.
========================================================== */

function StatusGlyph({ status }) {
    if (status === "completed") {
        return <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />;
    }

    if (status === "running") {
        return <Loader2 size={15} className="shrink-0 animate-spin text-violet-300" />;
    }

    if (status === "failed") {
        return <XCircle size={15} className="shrink-0 text-red-400" />;
    }

    return <TerminalSquare size={15} className="shrink-0 text-slate-500" />;
}

function ActivityFeed({ events = [], className }) {
    const newestFirst = [...events].reverse();

    return (
        <div className={cn("panel flex flex-col p-6", className)}>
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-slate-100">
                        Activity Feed
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Live workflow events
                    </p>
                </div>

                <span className="rounded-full bg-slate-400/10 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                    {events.length}
                </span>
            </div>

            {events.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-400/15">
                    <Loader2 size={26} className="animate-spin text-violet-400" />

                    <p className="mt-4 text-sm text-slate-500">
                        Waiting for the first agent event…
                    </p>
                </div>
            )}

            <div className="no-scrollbar max-h-[540px] space-y-2.5 overflow-y-auto">
                {newestFirst.map((event, index) => {
                    const agent = getAgent(event.agent);
                    const Icon = agent?.icon || TerminalSquare;
                    const palette = TINTS[agent?.tint] || TINTS.violet;

                    return (
                        <div
                            key={`${event.agent}-${index}`}
                            className="flex items-start gap-3 rounded-xl border border-slate-400/10 bg-white/[0.02] p-3"
                        >
                            <span
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                                    palette.bg,
                                    palette.ring
                                )}
                            >
                                <Icon size={14} className={palette.icon} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-xs font-semibold text-slate-200">
                                        {agent?.name || event.agent || "workflow"}
                                    </p>

                                    <span className="shrink-0 font-mono text-[10px] text-slate-600">
                                        {formatTime(event.receivedAt)}
                                    </span>
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                    {event.label || event.status}
                                </p>
                            </div>

                            <StatusGlyph status={event.status} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ActivityFeed;
