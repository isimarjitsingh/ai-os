import { Link } from "react-router-dom";
import { FolderOpen, ArrowUpRight } from "lucide-react";

import Badge from "../ui/Badge";
import { cn } from "../../lib/cn";
import { truncate, relativeTime, projectStatusMeta } from "../../lib/format";

/* ==========================================================
   ProjectCard — one real project from GET /projects.

   Shape follows the mockups: icon tile, title, status chip,
   a progress rail, the updated timestamp and an "Open project"
   affordance.

   The API exposes no per-agent progress field, so the rail is
   derived only from `status`:
     completed → full and green
     failed    → full and red
     running   → indeterminate animated stripe
     waiting   → empty
   Nothing invents a percentage it does not have.
========================================================== */

function railFor(status) {
    if (status === "completed") {
        return { className: "w-full bg-gradient-to-r from-violet-500 to-indigo-400", width: "100%" };
    }

    if (status === "failed") {
        return { className: "w-full bg-red-500/70", width: "100%" };
    }

    if (status === "running") {
        return {
            className: "w-1/3 bg-violet-400 progress-stripes",
            width: "33%",
        };
    }

    return { className: "bg-slate-500/40", width: "4%" };
}

function ProjectCard({ project, className }) {
    const name = project?.project_name || "Untitled Startup";
    const meta = projectStatusMeta(project?.status);
    const rail = railFor(project?.status);

    return (
        <Link
            to={`/project/${project.thread_id}`}
            className={cn(
                "panel panel-interactive group flex flex-col p-5",
                className
            )}
        >
            <span className="tile tile-brand h-10 w-10 rounded-xl">
                <FolderOpen size={17} />
            </span>

            <h3 className="mt-4 truncate text-base font-bold text-slate-100 transition group-hover:text-violet-200">
                {name}
            </h3>

            <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
                {truncate(project?.startup_idea || "No idea recorded.", 110)}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
                <Badge status={project?.status} label={meta.label} />
            </div>

            <div className="rail mt-3">
                <span
                    className={rail.className}
                    style={{ width: rail.width }}
                    aria-hidden="true"
                />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3.5">
                <span className="truncate text-[11px] text-slate-600">
                    {project?.created_at ? relativeTime(project.created_at) : "—"}
                </span>

                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-300 transition group-hover:text-violet-200">
                    Open project
                    <ArrowUpRight
                        size={13}
                        className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                </span>
            </div>
        </Link>
    );
}

export default ProjectCard;
