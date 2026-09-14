import { Link } from "react-router-dom";
import {
    Plus,
    Rocket,
    FolderOpen,
    CheckCircle2,
    Loader2,
    History,
    ArrowRight,
    Bot,
    AlertTriangle,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Panel from "../components/ui/Panel";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import ProjectCard from "../components/projects/ProjectCard";

import { useAuth } from "../context/AuthContext";
import { useProjects } from "../hooks/useProjects";
import { AGENTS } from "../lib/agents";
import { countByStatus, relativeTime, sortByNewest } from "../lib/format";

/* ==========================================================
   Home / Dashboard
   Every number here is derived from GET /projects.
========================================================== */

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function Home() {
    const { user } = useAuth();
    const { projects, loading, error, reload } = useProjects();

    const stats = countByStatus(projects);
    const recent = sortByNewest(projects).slice(0, 4);
    const latest = recent[0];

    const firstName = (user?.name || "").split(" ")[0];

    return (
        <div className="space-y-7">
            <PageHeader
                eyebrow="Overview"
                title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
                description="Your autonomous company at a glance — projects, pipeline and live status."
                actions={
                    <>
                        <Link to="/projects" className="btn-ghost text-sm">
                            All Projects
                        </Link>

                        <Link to="/generate" className="btn-primary text-sm">
                            <Plus size={16} />
                            New Startup
                        </Link>
                    </>
                }
            />

            {/* ---------- Metrics ---------- */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Projects"
                    value={projects.length}
                    hint="Generated under your account"
                    icon={FolderOpen}
                    tone="violet"
                    loading={loading}
                />

                <StatCard
                    title="Completed"
                    value={stats.completed || 0}
                    hint="Ready to open and preview"
                    icon={CheckCircle2}
                    tone="emerald"
                    loading={loading}
                />

                <StatCard
                    title="In Progress"
                    value={stats.running || 0}
                    hint="Agents currently working"
                    icon={Loader2}
                    tone="cyan"
                    loading={loading}
                />

                <StatCard
                    title="Last Activity"
                    value={latest?.created_at ? relativeTime(latest.created_at) : "—"}
                    hint={latest ? latest.project_name || "Untitled Startup" : "Nothing generated yet"}
                    icon={History}
                    tone="amber"
                    loading={loading}
                />
            </section>

            {/* ---------- Body ---------- */}
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-4 xl:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                            Recent Projects
                        </h2>

                        {projects.length > 0 && (
                            <Link
                                to="/projects"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                            >
                                View all
                                <ArrowRight size={13} />
                            </Link>
                        )}
                    </div>

                    {loading && (
                        <div className="space-y-4">
                            {[0, 1, 2].map((key) => (
                                <Skeleton key={key} className="h-[122px] w-full" />
                            ))}
                        </div>
                    )}

                    {!loading && error && (
                        <div className="panel flex items-center justify-between gap-4 p-5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />

                                <div>
                                    <p className="text-sm font-semibold text-slate-200">
                                        Could not load your projects
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">{error}</p>
                                </div>
                            </div>

                            <button onClick={reload} className="btn-ghost shrink-0 text-xs">
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && projects.length === 0 && (
                        <EmptyState
                            icon={Rocket}
                            title="No startups yet"
                            description="Describe an idea and six autonomous agents will research, plan, finance, architect and build it for you."
                            action={
                                <Link to="/generate" className="btn-primary text-sm">
                                    <Rocket size={16} />
                                    Generate your first startup
                                </Link>
                            }
                        />
                    )}

                    {!loading && !error &&
                        recent.map((project) => (
                            <ProjectCard key={project.thread_id} project={project} />
                        ))}
                </div>

                {/* Pipeline */}
                <Panel
                    title="Company Pipeline"
                    subtitle="Fixed execution order"
                    icon={Bot}
                    padded={false}
                    className="h-fit"
                    action={
                        <Link
                            to="/agents"
                            className="text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                        >
                            Details
                        </Link>
                    }
                >
                    <ul className="divide-y divide-slate-400/8">
                        {AGENTS.map((agent, index) => {
                            const Icon = agent.icon;

                            return (
                                <li
                                    key={agent.id}
                                    className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-white/[0.02]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-inset ring-violet-400/20">
                                        <Icon size={16} className="text-violet-300" />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-200">
                                            {agent.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {agent.output}
                                        </p>
                                    </div>

                                    <span className="shrink-0 text-[10px] font-bold text-slate-600">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="border-t border-slate-400/8 p-5">
                        <Badge
                            status="waiting"
                            label="Idle — no active workflow"
                            dot={false}
                            className="w-full justify-center"
                        />
                    </div>
                </Panel>
            </section>
        </div>
    );
}

export default Home;

