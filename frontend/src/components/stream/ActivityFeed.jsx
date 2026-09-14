import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";

import { getAgent } from "../../lib/agents";
import { formatTime } from "../../lib/format";

/* ==========================================================
   ActivityFeed — mockup row style:
   coloured dot · agent name · action line · quoted detail ·
   timestamp right-aligned.

   Real SSE payload is { agent, status, output }; `label` is
   derived in useGeneration and `receivedAt` is stamped
   client-side. Pass events from lib/activitySample.js to
   render the roster preview on the Agents page.
========================================================== */

const DOT_BY_STATUS = {
    completed: "bg-emerald-400",
    running: "bg-violet-400",
    failed: "bg-red-400",
    waiting: "bg-slate-500",
};

const ACTION_BY_STATUS = {
    completed: "completed its pass",
    running: "is executing now",
    failed: "stopped with an error",
    waiting: "queued",
};

function agentName(id) {
    return getAgent(id)?.name || id || "workflow";
}

function ActivityFeed({
    events = [],
    className,
    title = "Activity Feed",
    subtitle = "Live workflow events",
    live = true,
    emptyHint = "Waiting for the first agent event…",
    footerTo,
    footerLabel = "View All Activity",
}) {
    return (
        <div className={"panel flex flex-col p-6 " + (className || "")}>
            {/* ---------- Header ---------- */}
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-100">{title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                </div>

                {live && (
                    <span className="chip chip-ok shrink-0">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Live
                    </span>
                )}
            </div>

            {events.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-400/15">
                    <Loader2 size={26} className="animate-spin text-violet-400" />

                    <p className="mt-4 px-4 text-center text-sm text-slate-500">{emptyHint}</p>
                </div>
            ) : (
                <ul className="no-scrollbar max-h-[540px] space-y-1 overflow-y-auto">
                    {events.map((event, index) => {
                        const status = event.status || "waiting";

                        return (
                            <li
                                key={`${event.agent}-${index}`}
                                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]"
                            >
                                <span
                                    className={
                                        "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                                        (DOT_BY_STATUS[status] || DOT_BY_STATUS.waiting) +
                                        (status === "running" ? " live-dot" : "")
                                    }
                                />

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold text-slate-200">
                                        {agentName(event.agent)}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {ACTION_BY_STATUS[status] || ACTION_BY_STATUS.waiting}
                                    </p>

                                    {event.label && (
                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                            &ldquo;{event.label}&rdquo;
                                        </p>
                                    )}
                                </div>

                                <span className="shrink-0 font-mono text-[10px] text-slate-600">
                                    {formatTime(event.receivedAt)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* ---------- Footer ---------- */}
            {footerTo && (
                <Link to={footerTo} className="btn-ghost mt-4 w-full text-xs">
                    {footerLabel}
                    <ArrowRight size={13} />
                </Link>
            )}
        </div>
    );
}

export default ActivityFeed;
