import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, FolderOpen, Rocket } from "lucide-react";

import useGeneration from "../hooks/useGeneration";
import AgentProgress from "../components/stream/AgentProgress";
import ActivityFeed from "../components/stream/ActivityFeed";
import CurrentAgentPanel from "../components/stream/CurrentAgentPanel";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import EmptyState from "../components/ui/EmptyState";
import { truncate } from "../lib/format";

/* ==========================================================
   Generation — live agent console driven by SSE.
   Presentation only: the wiring lives in hooks/useGeneration.
========================================================== */

const CRUMBS = [
    { label: "Home", to: "/" },
    { label: "Generate", to: "/generate" },
    { label: "Live Workflow" },
];

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

/* The composer sends a structured brief — surface just the idea. */
function extractIdea(userGoal) {
    if (!userGoal) return "Agents are executing your request.";

    const match = /Startup Idea:\s*\n([^\n]+)/.exec(userGoal);
    const text = (match ? match[1] : userGoal).replace(/\s+/g, " ").trim();

    return truncate(text, 180);
}

function Generation() {
    const location = useLocation();
    const navigate = useNavigate();

    const { threadId, userGoal } = location.state || {};

    const {
        events,
        statuses,
        completed,
        total,
        percentage,
        currentAgent,
        finished,
        failed,
        error,
        connected,
        elapsed,
    } = useGeneration(threadId, userGoal);

    /* Console lines + per-agent durations, both derived from the
       real event stream (receivedAt is stamped client-side). */
    const { logs, durations } = useMemo(() => {
        const startedAt = {};
        const byAgent = {};

        const lines = events.map((event, index) => ({
            id: `${event.agent}-${index}`,
            time: new Date(event.receivedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
            text: `${event.agent || "workflow"} → ${event.status || "update"}${
                event.label ? ` · ${event.label}` : ""
            }`,
        }));

        events.forEach((event) => {
            const stamp = event.receivedAt?.getTime?.() ?? 0;

            if (event.status === "running") startedAt[event.agent] = stamp;

            if (
                (event.status === "completed" || event.status === "failed") &&
                startedAt[event.agent]
            ) {
                const secs = Math.max(0, Math.round((stamp - startedAt[event.agent]) / 1000));
                byAgent[event.agent] = formatDuration(secs);
            }
        });

        return { logs: lines, durations: byAgent };
    }, [events]);

    /* Land on the project once the workflow completes */
    useEffect(() => {
        if (!finished) return undefined;

        const timer = setTimeout(() => {
            navigate(`/project/${threadId}`, { replace: true });
        }, 1600);

        return () => clearTimeout(timer);
    }, [finished, navigate, threadId]);

    /* ---------------- invalid entry ---------------- */

    if (!threadId) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <EmptyState
                    icon={Rocket}
                    title="No active workflow"
                    description="This screen only renders while a generation is running. Start a new startup to open the live console."
                    action={
                        <Link to="/generate" className="btn-primary text-sm">
                            <Rocket size={16} />
                            Start a workflow
                        </Link>
                    }
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumbs items={CRUMBS} />

            {/* ---------------- Hero ---------------- */}
            <div className="hero-banner p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-5">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                            🚀
                        </span>

                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-white sm:text-3xl">
                                Building Your Startup
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                The autonomous graph is executing your brief. Every agent
                                streams its result back the moment it lands.
                            </p>

                            <span className="chip mt-4 max-w-full rounded-full !bg-white/10 !text-slate-200">
                                <span className="truncate">
                                    Startup idea: {extractIdea(userGoal)}
                                </span>
                            </span>
                        </div>
                    </div>

                    <p className="hidden max-w-[15rem] shrink-0 border-l border-white/15 pl-5 text-right text-sm italic leading-relaxed text-slate-400 lg:block">
                        &ldquo;Describe it once. Watch a company build it.&rdquo;
                    </p>
                </div>
            </div>

            {/* ---------------- Failure ---------------- */}
            {failed && (
                <div className="panel border-red-400/25 bg-red-500/[0.06] p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3.5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-inset ring-red-400/30">
                                <AlertTriangle size={18} className="text-red-300" />
                            </span>

                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-red-200">
                                    Workflow failed
                                </h2>

                                <p className="mt-1 break-words text-sm text-red-200/70">
                                    {error || "The graph stopped before completion."}
                                </p>

                                <p className="mt-2 font-mono text-[11px] text-red-200/40">
                                    thread {threadId}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-3">
                            <Link to="/projects" className="btn-ghost text-xs">
                                <FolderOpen size={14} />
                                My Projects
                            </Link>

                            <Link to="/generate" className="btn-primary text-xs">
                                <Rocket size={14} />
                                Try again
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- Console ---------------- */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <AgentProgress
                    completed={completed}
                    total={total}
                    percentage={percentage}
                    currentAgent={currentAgent}
                    finished={finished}
                    failed={failed}
                    connected={connected}
                    elapsed={elapsed}
                    statuses={statuses}
                    durations={durations}
                    detailsTo="/agents"
                />

                <div className="min-w-0 space-y-6">
                    <CurrentAgentPanel
                        agentId={currentAgent}
                        elapsed={elapsed}
                        logs={logs}
                        running={!finished && !failed && Boolean(currentAgent)}
                    />

                    <ActivityFeed
                        events={events}
                        subtitle={`${events.length} streamed events`}
                        live={connected}
                    />
                </div>
            </div>

            {/* ---------------- Success ---------------- */}
            {finished && (
                <div className="panel border-emerald-400/25 bg-emerald-500/[0.06] p-6 text-center">
                    <h2 className="text-xl font-bold text-emerald-200">
                        🎉 Startup generated successfully
                    </h2>

                    <p className="mt-1.5 text-sm text-emerald-200/60">
                        Preparing your project dashboard…
                    </p>

                    <Link to={`/project/${threadId}`} className="btn-ghost mt-5 text-xs">
                        <FolderOpen size={14} />
                        Open project now
                    </Link>
                </div>
            )}


        </div>
    );
}

export default Generation;
