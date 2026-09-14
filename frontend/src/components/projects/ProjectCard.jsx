import { Link } from "react-router-dom";
import { ArrowUpRight, FolderOpen } from "lucide-react";

import Badge from "../ui/Badge";
import { cn } from "../../lib/cn";
import {
    initials,
    truncate,
    relativeTime,
    projectStatusMeta,
} from "../../lib/format";

/* ==========================================================
   ProjectCard — one real project row from GET /projects
========================================================== */

function ProjectCard({ project, className }) {
    const name = project?.project_name || "Untitled Startup";
    const meta = projectStatusMeta(project?.status);

    return (
        <Link
            to={`/project/${project.thread_id}`}
            className={cn(
                "panel panel-interactive group block overflow-hidden",
                className
            )}
        >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                {/* Identity */}
                <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/10 text-sm font-bold text-violet-200 ring-1 ring-inset ring-violet-400/25">
                        {initials(name, "?")}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-slate-100 transition group-hover:text-violet-200">
                            {name}
                        </h3>

                        <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                            {truncate(project?.startup_idea || "No idea recorded.", 180)}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                <FolderOpen size={13} className="text-slate-600" />
                                {project?.thread_id?.slice(0, 8) || "—"}
                            </span>

                            {project?.created_at && (
                                <span>
                                    {relativeTime(project.created_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="flex shrink-0 flex-col items-end gap-3">
                    <Badge status={project?.status} label={meta.label} />

                    <ArrowUpRight
                        size={17}
                        className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-300"
                    />
                </div>
            </div>
        </Link>
    );
}

export default ProjectCard;
