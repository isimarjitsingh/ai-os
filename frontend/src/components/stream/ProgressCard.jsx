import { Clock3, Wifi, WifiOff } from "lucide-react";

import Ring from "../ui/Ring";
import { getAgent } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   ProgressCard — overall workflow progress with a donut.
   Every number here is derived from the SSE stream.
========================================================== */

function formatClock(seconds) {
    const safe = Math.max(0, seconds || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function startedAgo(seconds) {
    const mins = Math.floor(Math.max(0, seconds || 0) / 60);

    if (mins < 1) return "just now";
    if (mins === 1) return "1 minute ago";

    return `${mins} minutes ago`;
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
    const remaining = Math.max(0, total - completed);

    const tone = failed ? "#ef4444" : finished ? "#22c55e" : "#8b5cf6";

    const headline = failed
        ? "Workflow failed"
        : finished
        ? "Workflow complete"
        : agent?.name || "Waiting for first event";

    const barTone = failed
        ? "from-red-500 to-rose-500"
        : finished
        ? "from-emerald-400 to-teal-500"
        : "from-violet-500 via-indigo-500 to-blue-500";

    return (
        <div className="panel p-6">
            {/* ---------- Header ---------- */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-100">Overall Progress</h2>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{headline}</p>
                </div>

                <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                    🕑 Started {startedAgo(elapsed)}
                </span>
            </div>

            {/* ---------- Donut + bar ---------- */}
            <div className="mt-6 grid items-center gap-6 sm:grid-cols-[130px_minmax(0,1fr)]">
                <div className="justify-self-start sm:justify-self-center">
                    <Ring value={percentage} size={130} stroke={10} color={tone} />
                </div>

                <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-300">
                            Agents completed
                        </p>

                        <p className="text-sm font-bold tabular-nums text-slate-200">
                            {completed}/{total}
                        </p>
                    </div>

                    <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-400/10">
                        <div
                            className={cn(
                                "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                                barTone,
                                !finished && !failed && connected && "progress-stripes"
                            )}
                            style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                    </div>

                    <p className="mt-2.5 text-xs text-slate-500">
                        {completed} of {total} agents completed
                        {remaining > 0 ? `, ${remaining} remaining` : " — all done"}
                    </p>
                </div>
            </div>

            {/* ---------- Footer ---------- */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className={cn("chip", connected ? "chip-ok" : "chip-idle")}>
                    {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {connected ? "SSE connected" : "Stream closed"}
                </span>

                <span className="chip chip-idle">
                    <Clock3 size={12} />
                    {formatClock(elapsed)} elapsed
                </span>

                {failed && <span className="chip chip-off">Failed</span>}

                {finished && !failed && <span className="chip chip-ok">Complete</span>}

                {!finished && !failed && agent && (
                    <span className="chip chip-run">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />
                        Executing {agent.id}
                    </span>
                )}
            </div>
        </div>
    );
}

export default ProgressCard;
