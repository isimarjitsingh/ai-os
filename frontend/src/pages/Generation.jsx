import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FolderOpen, Rocket } from "lucide-react";

import useGeneration from "../hooks/useGeneration";
import AgentProgress from "../components/stream/AgentProgress";
import ActivityFeed from "../components/stream/ActivityFeed";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { truncate } from "../lib/format";

/* ==========================================================
   Generation — live agent console driven by SSE.
========================================================== */

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
        <div className="space-y-7">
            <PageHeader
                eyebrow="Live Workflow"
                title="Building your startup"
                description={
                    userGoal
                        ? truncate(userGoal.replace(/\n+/g, " "), 200)
                        : "Agents are executing your request."
                }
                actions={
                    <Link to="/generate" className="btn-ghost text-xs">
                        <ArrowLeft size={14} />
                        New run
                    </Link>
                }
            />

            {/* ---------------- failure ---------------- */}
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

            {/* ---------------- console ---------------- */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
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
                    />
                </div>

                <ActivityFeed
                    events={events}
                    className="xl:sticky xl:top-24 xl:col-span-1"
                />
            </div>

            {/* ---------------- success ---------------- */}
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

