import { Activity, Clock3, CheckCircle2, Wifi, WifiOff } from "lucide-react";

import { getAgent } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   ProgressCard — overall workflow progress + live pulse.
========================================================== */

function formatClock(seconds) {
    const safe = Math.max(0, seconds || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function ProgressCard({
    completed = 0,
    total = 6,
    percentage = 0,
    currentAgent = null,
    finished = false,
    failed = false,
    connected = false,
    elapsed = 0,
}) {
    const agent = getAgent(currentAgent);
    const Icon = agent?.icon || Activity;

    const headline = failed
        ? "Workflow failed"
        : finished
        ? "Workflow complete"
        : agent?.name || "Waiting for first event";

    const tone = failed
        ? "text-red-300"
        : finished
        ? "text-emerald-300"
        : "text-violet-300";

    const barTone = failed
        ? "from-red-500 to-rose-500"
        : finished
        ? "from-emerald-400 to-teal-500"
        : "from-violet-500 via-indigo-500 to-blue-500";

    return (
        <div className="panel overflow-hidden p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow">Overall Progress</p>

                    <h2 className="mt-1.5 truncate text-xl font-bold text-slate-100">
                        {headline}
                    </h2>
                </div>

                <div className="text-right">
                    <p className={cn("text-3xl font-bold tabular-nums", tone)}>
                        {percentage}%
                    </p>

                    <p className="text-[11px] text-slate-500">
                        {completed} / {total} agents
                    </p>
                </div>
            </div>

            {/* bar */}
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-400/10">
                <div
                    className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                        barTone,
                        !finished && !failed && connected && "progress-stripes"
                    )}
                    style={{ width: `${Math.max(percentage, 3)}%` }}
                />
            </div>

            {/* footer */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                    {connected ? (
                        <Wifi size={13} className="text-emerald-400" />
                    ) : (
                        <WifiOff size={13} className="text-slate-600" />
                    )}
                    {connected ? "SSE connected" : "Stream closed"}
                </span>

                <span className="flex items-center gap-2">
                    <Clock3 size={13} className="text-slate-600" />
                    {formatClock(elapsed)} elapsed
                </span>

                {!finished && !failed && (
                    <span className="flex items-center gap-2">
                        <Icon size={13} className="text-violet-300" />
                        {agent ? "Executing now" : "Idle"}
                    </span>
                )}

                {finished && (
                    <span className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 size={13} />
                        Opening project…
                    </span>
                )}
            </div>
        </div>
    );
}

export default ProgressCard;
