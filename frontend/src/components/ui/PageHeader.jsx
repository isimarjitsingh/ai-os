import { cn } from "../../lib/cn";
import Breadcrumbs from "./Breadcrumbs";

/* ==========================================================
   PageHeader — the in-page SECTION bar, not the page title.

   The page identity (date, title, description) now lives in the
   masthead rendered by layout/Header.jsx from lib/pageMeta.js.
   This component is what the mockups show *inside* a screen: a
   small uppercase eyebrow, a section heading and the actions
   that belong to that section — e.g. "WORKSPACE LIBRARY /
   3 active projects" with a New project button.

   It renders an <h2> so a screen never has two <h1> elements.
   `crumbs` is still supported for detail pages.
========================================================== */

function PageHeader({ eyebrow, crumbs, title, description, actions, className }) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
                className
            )}
        >
            <div className="min-w-0">
                {crumbs && crumbs.length > 0 && (
                    <Breadcrumbs items={crumbs} className="mb-2.5" />
                )}

                {eyebrow && <p className="section-label mb-1.5">{eyebrow}</p>}

                <h2 className="text-xl font-bold tracking-tight text-slate-50 sm:text-[22px]">
                    {title}
                </h2>

                {description && (
                    <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
            )}
        </div>
    );
}

export default PageHeader;
