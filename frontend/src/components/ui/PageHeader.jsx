import { cn } from "../../lib/cn";

/* ==========================================================
   PageHeader — consistent title block for every route.
========================================================== */

function PageHeader({ eyebrow, title, description, actions, className }) {
    return (
        <div
            className={cn(
                "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
                className
            )}
        >
            <div className="min-w-0">
                {eyebrow && (
                    <p className="eyebrow mb-2">{eyebrow}</p>
                )}

                <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                    {title}
                </h1>

                {description && (
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
