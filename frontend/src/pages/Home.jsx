import { Link } from "react-router-dom";
import {
    Rocket,
    Clock,
    TrendingUp,
    Activity,
    ArrowRight,
    Bot,
    FolderOpen,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

import Panel from "../components/ui/Panel";
import Ring from "../components/ui/Ring";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import ProjectCard from "../components/projects/ProjectCard";

import { useProjects } from "../hooks/useProjects";
import { AGENTS } from "../lib/agents";
import {
    countByStatus,
    relativeTime,
    sortByNewest,
    truncate,
    projectStatusMeta,
} from "../lib/format";

/* ==========================================================
   Home / Dashboard

   Layout follows the reference screen:
     1. full-bleed hero slab naming the active workspace
     2. a wide left column (progress + recent workspaces)
     3. a narrow right rail (status + pipeline)

   Every figure is derived from GET /projects — the endpoint
   returns thread_id, project_name, startup_idea, status,
   generated_path and created_at, and nothing is invented.
========================================================== */

const STATUS_ROWS = [
    { key: "completed", label: "Completed", icon: CheckCircle2, tone: "text-emerald-300" },
    { key: "running", label: "Running", icon: Activity, tone: "text-violet-300" },
    { key: "failed", label: "Failed", icon: AlertTriangle, tone: "text-red-300" },
    { key: "waiting", label: "Waiting", icon: Clock, tone: "text-slate-400" },
];

function Hero({ project }) {
    const meta = projectStatusMeta(project?.status);

    return (
        <section className="hero-banner flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex min-w-0 items-start gap-4">
                <span className="tile tile-brand h-12 w-12 shrink-0 rounded-2xl">
                    <Rocket size={22} className="text-violet-200" />
                </span>

                <div className="min-w-0">
                    <p className="section-label">Active workspace</p>

                    <h2 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                        {project?.project_name || "Building Your Startup"}
                    </h2>

                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                        {project
                            ? truncate(project.startup_idea, 110)
                            : "From idea to reality, powered by AI agents."}
                    </p>
                </div>
            </div>

            <div className="shrink-0 lg:text-right">
                {project ? (
                    <>
                        <Badge status={project.status} label={meta.label} />
                        <p className="mt-2 text-xs text-slate-500">
                            {relativeTime(project.created_at)}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="section-label">One idea</p>
                        <p className="mt-1.5 text-sm text-slate-400">A faster tomorrow.</p>
                    </>
                )}
            </div>
        </section>
    );
}

/* ---------------- Overall progress ---------------- */

function ProgressPanel({ total, completed, running, failed, latest, loading }) {
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const remaining = Math.max(0, total - completed);

    return (
        <Panel
            title="Overall progress"
            subtitle="Track the progress of your AI company workflow."
            icon={TrendingUp}
            action={
                latest?.created_at ? (
                    <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                        <Clock size={13} />
                        Started {relativeTime(latest.created_at)}
                    </span>
                ) : null
            }
        >
            {loading ? (
                <div className="flex items-center gap-6">
                    <Skeleton className="h-28 w-28 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-2.5 w-full" />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                    <Ring value={pct} size={112} stroke={9} label={`${pct}%`} />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-4">
                            <p className="truncate text-sm font-semibold text-slate-200">
                                AI Company Workflow
                            </p>

                            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-400">
                                {completed}/{total}
                            </span>
                        </div>

                        <div className="rail mt-3">
                            <span
                                className="bg-gradient-to-r from-violet-500 to-indigo-400"
                                style={{ width: `${pct}%` }}
                            />
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                            {total
                                ? `${completed} of ${total} workspaces completed, ${remaining} remaining`
                                : "No workspaces yet — generate one to start the pipeline."}
                        </p>

                        {running > 0 || failed > 0 ? (
                            <p className="mt-1.5 text-xs text-slate-600">
                                {running > 0 ? `${running} running now. ` : ""}
                                {failed > 0 ? `${failed} failed.` : ""}
                            </p>
                        ) : null}
                    </div>
                </div>
            )}
        </Panel>
    );
}

/* ---------------- Right rail: status + pipeline ---------------- */

function StatusPanel({ counts, total }) {
    return (
        <Panel
            title="Workspace status"
            subtitle="Across every run on your account"
            icon={FolderOpen}
        >
            <ul className="space-y-1">
                {STATUS_ROWS.map((row) => {
                    const Icon = row.icon;

                    return (
                        <li key={row.key} className="flex items-center gap-3 py-2">
                            <Icon size={15} className={row.tone} />

                            <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                                {row.label}
                            </span>

                            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-100">
                                {counts[row.key] || 0}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-slate-600">
                {total} workspace{total === 1 ? "" : "s"} in total
            </p>
        </Panel>
    );
}

function PipelinePanel() {
    return (
        <Panel
            title="Company pipeline"
            subtitle="Fixed execution order"
            icon={Bot}
            padded={false}
            action={
                <Link
                    to="/agents"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                >
                    Details
                    <ArrowRight size={12} />
                </Link>
            }
        >
            <ul className="divide-y divide-slate-400/8">
                {AGENTS.map((agent, index) => {
                    const Icon = agent.icon;

                    return (
                        <li
                            key={agent.id}
                            className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
                        >
                            <span className="tile tile-brand h-8 w-8 rounded-lg">
                                <Icon size={15} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-200">
                                    {agent.name}
                                </p>
                                <p className="truncate text-xs text-slate-600">{agent.output}</p>
                            </div>

                            <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-700">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

/* ========================================================== */

function Home() {
    const { projects, loading, error, reload } = useProjects();

    const counts = countByStatus(projects);
    const total = projects.length;
    const completed = counts.completed || 0;
    const running = counts.running || 0;
    const failed = counts.failed || 0;

    const recent = sortByNewest(projects);
    const latest = recent[0];

    return (
        <div className="space-y-6">
            <Hero project={latest} />

            {error && (
                <div className="panel flex items-center justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />

                        <div>
                            <p className="text-sm font-semibold text-slate-200">
                                Could not load your workspaces
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{error}</p>
                        </div>
                    </div>

                    <button onClick={reload} className="btn-ghost shrink-0 text-xs">
                        Retry
                    </button>
                </div>
            )}

            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* ---------------- Left column ---------------- */}
                <div className="min-w-0 space-y-6">
                    <ProgressPanel
                        total={total}
                        completed={completed}
                        running={running}
                        failed={failed}
                        latest={latest}
                        loading={loading}
                    />

                    <div className="min-w-0">
                        <div className="mb-4 flex items-end justify-between gap-4">
                            <div>
                                <p className="section-label mb-1.5">Recent workspaces</p>

                                <h2 className="text-lg font-bold text-slate-100">
                                    Newest first
                                </h2>
                            </div>

                            {total > 0 ? (
                                <Link
                                    to="/projects"
                                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                                >
                                    View all
                                    <ArrowRight size={12} />
                                </Link>
                            ) : null}
                        </div>

                        {loading ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Skeleton className="h-[228px] w-full rounded-2xl" />
                                <Skeleton className="h-[228px] w-full rounded-2xl" />
                            </div>
                        ) : total === 0 ? (
                            <div className="panel p-5">
                                <EmptyState
                                    icon={Rocket}
                                    compact
                                    title="No workspaces yet"
                                    description="Describe an idea and the agents will research, plan, finance, architect and build it."
                                    action={
                                        <Link to="/generate" className="btn-solid text-sm">
                                            <Rocket size={15} />
                                            New workspace
                                        </Link>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {recent
                                    .slice(0, 4)
                                    .map((project) => (
                                        <ProjectCard
                                            key={project.thread_id}
                                            project={project}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ---------------- Right rail ---------------- */}
                <div className="min-w-0 space-y-6">
                    <StatusPanel counts={counts} total={total} />
                    <PipelinePanel />
                </div>
            </div>
        </div>
    );
}

export default Home;



