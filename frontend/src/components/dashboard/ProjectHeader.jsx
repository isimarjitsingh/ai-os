import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Rocket, Hash } from "lucide-react";

import Badge from "../ui/Badge";
import { formatDate, initials } from "../../lib/format";

/* ==========================================================
   ProjectHeader — hero for a single project.
========================================================== */

function ProjectHeader({ project, fileCount = 0, onPreview }) {
    if (!project) return null;

    const name = project.project_name || "Untitled Startup";

    return (
        <div className="panel relative overflow-hidden p-6 sm:p-8">
            {/* glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(38rem 20rem at 8% 0%, rgba(124,58,237,0.22), transparent 62%)",
                }}
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-violet-900/40">
                        {initials(name, "?")}
                    </div>

                    <div className="min-w-0">
                        <Link
                            to="/projects"
                            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-violet-300"
                        >
                            <ArrowLeft size={13} />
                            All projects
                        </Link>

                        <h1 className="truncate text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                            {name}
                        </h1>

                        <p className="mt-2.5 line-clamp-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                            {project.startup_idea || "No startup idea recorded."}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                            <Badge status={project.status} />

                            <span className="flex items-center gap-1.5">
                                <Hash size={12} />
                                {project.thread_id?.slice(0, 8)}
                            </span>

                            <span>Created {formatDate(project.created_at)}</span>

                            <span className="flex items-center gap-1.5">
                                <Rocket size={12} />
                                {fileCount} file{fileCount === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>
                </div>

                {onPreview && (
                    <button
                        onClick={onPreview}
                        disabled={fileCount === 0}
                        title={
                            fileCount === 0
                                ? "No generated files to preview yet"
                                : "Run the generated site in WebContainer"
                        }
                        className="btn-primary shrink-0 text-sm disabled:opacity-40"
                    >
                        <Eye size={16} />
                        Live Preview
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProjectHeader;
