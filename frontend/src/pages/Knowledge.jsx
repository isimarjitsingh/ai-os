import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    Plus,
    FileText,
    BookOpen,
    ArrowUpRight,
    X,
    AlertTriangle,
} from "lucide-react";

import Panel from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

import { useProjects } from "../hooks/useProjects";
import { formatDate, relativeTime, sortByNewest, truncate } from "../lib/format";

/* ==========================================================
   Knowledge — the report library.

   Reports are stored on the project row by the agent graph, so
   this screen indexes real projects and links into their report
   tabs. The mockup's "Add knowledge" affordance becomes "New
   workspace": documents land here as a by-product of a run and
   there is no standalone upload endpoint to wire a button to.
========================================================== */

function KnowledgeRow({ project }) {
    return (
        <li className="border-b border-[var(--color-line)] last:border-0">
            <Link
                to={`/project/${project.thread_id}`}
                className="row-link group px-5 py-4 sm:px-6"
            >
                <span className="tile tile-brand h-10 w-10 rounded-xl">
                    <FileText size={17} />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100 transition group-hover:text-violet-200">
                        {project.project_name || "Untitled project"}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {truncate(project.startup_idea || "No idea recorded.", 90)}
                    </span>
                </span>

                <span className="hidden w-24 shrink-0 text-right text-xs text-slate-500 sm:block">
                    {relativeTime(project.created_at) || formatDate(project.created_at)}
                </span>

                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-300 transition group-hover:text-violet-200">
                    Open
                    <ArrowUpRight size={13} />
                </span>
            </Link>
        </li>
    );
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
        return (
            <div className="panel flex items-center gap-3 p-5">
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />

                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                        Could not load the library
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ---------- Toolbar ---------- */}
            <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-black/30 px-3.5 py-2.5 transition focus-within:border-violet-400/60">
                    <Search size={15} className="shrink-0 text-slate-500" />

                    <input
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Search your knowledge..."
                        aria-label="Search knowledge"
                        className="w-full min-w-0 bg-transparent text-sm text-slate-200 placeholder:text-slate-600"
                    />

                    {term && (
                        <button
                            onClick={() => setTerm("")}
                            className="shrink-0 text-slate-500 transition hover:text-slate-200"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <Link to="/generate" className="btn-solid shrink-0">
                    <Plus size={15} />
                    New workspace
                </Link>
            </div>

            {/* ---------- Library ---------- */}
            <Panel
                title="Knowledge base"
                subtitle={
                    loading
                        ? "Loading documents..."
                        : `${projects.length} ${projects.length === 1 ? "document" : "documents"} available to your agents.`
                }
                icon={BookOpen}
                padded={false}
            >
                {loading ? (
                    <div className="space-y-3 p-5 sm:p-6">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="p-5 sm:p-6">
                        <EmptyState
                            icon={FileText}
                            compact
                            title={projects.length ? "No matches" : "No documents yet"}
                            description={
                                projects.length
                                    ? "No project matches that search."
                                    : "Generate a workspace and the agents will fill this library."
                            }
                            action={
                                projects.length ? (
                                    <button
                                        onClick={() => setTerm("")}
                                        className="btn-ghost text-xs"
                                    >
                                        Clear search
                                    </button>
                                ) : (
                                    <Link to="/generate" className="btn-solid text-sm">
                                        <Plus size={15} />
                                        New workspace
                                    </Link>
                                )
                            }
                        />
                    </div>
                ) : (
                    <ul>
                        {visible.map((project) => (
                            <KnowledgeRow key={project.thread_id} project={project} />
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}

export default Knowledge;

