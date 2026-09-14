import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Search } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

import { useProjects } from "../hooks/useProjects";
import { formatDate, sortByNewest } from "../lib/format";

/* ==========================================================
   Knowledge — the report library. Each run stores its
   department reports on the project, so this indexes real
   projects and links into their report tabs.
========================================================== */

const CRUMBS = [{ label: "Home", to: "/" }, { label: "Knowledge" }];

function chipFor(status) {
    if (status === "completed") return "chip chip-ok";
    if (status === "failed") return "chip chip-off";
    if (status === "running") return "chip chip-run";

    return "chip chip-idle";
}

function Knowledge() {
    const { projects, loading, error } = useProjects();
    const [term, setTerm] = useState("");

    const visible = sortByNewest(projects).filter((project) => {
        const query = term.trim().toLowerCase();
        if (!query) return true;

        return `${project.project_name || ""} ${project.startup_idea || ""}`
            .toLowerCase()
            .includes(query);
    });

    if (error) {
        return <EmptyState icon={FileText} title="Could not load the library" description={error} />;
    }

    return (
        <div className="space-y-7">
            <PageHeader
                crumbs={CRUMBS}
                eyebrow="Library"
                title="Knowledge"
                description="Every report the agent graph has written for your projects — research, marketing, finance, engineering and the executive verdict."
            />

            <Panel
                title="Project reports"
                subtitle={`${projects.length} ${projects.length === 1 ? "run" : "runs"} indexed`}
                padded={false}
                action={
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-black/30 px-3 py-2">
                        <Search size={14} className="text-slate-500" />

                        <input
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="Filter projects…"
                            className="w-28 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 sm:w-44"
                        />
                    </div>
                }
            >
                {loading ? (
                    <div className="space-y-3 p-5">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="p-5">
                        <EmptyState
                            icon={FileText}
                            title={projects.length ? "No matches" : "No reports yet"}
                            description={
                                projects.length
                                    ? "No project matches that filter."
                                    : "Generate a startup and the agents will fill this library."
                            }
                            action={
                                <Link to="/generate" className="btn-primary text-xs">
                                    New Startup
                                </Link>
                            }
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-400/10">
                        {visible.map((project) => (
                            <li key={project.thread_id} className="px-5 py-4">
                                <Link
                                    to={`/project/${project.thread_id}`}
                                    className="group flex items-start justify-between gap-4"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-slate-100 group-hover:text-violet-200">
                                            {project.project_name || "Untitled project"}
                                        </span>

                                        <span className="mt-1 block truncate text-xs text-slate-500">
                                            {project.startup_idea}
                                        </span>

                                        <span className="mt-1.5 block text-[11px] text-slate-600">
                                            {formatDate(project.created_at)}
                                        </span>
                                    </span>

                                    <span className={chipFor(project.status)}>
                                        {project.status || "waiting"}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}

export default Knowledge;
