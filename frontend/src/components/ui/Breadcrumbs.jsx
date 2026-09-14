import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/* ==========================================================
   Breadcrumbs — Home › Section › Detail
   Rendered by PageHeader on every inner screen.
   Last entry is treated as the current page (never a link).
========================================================== */

function Breadcrumbs({ items = [], className }) {
    if (!items.length) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={
                "flex flex-wrap items-center gap-1.5 text-xs text-slate-500 sm:text-[13px] " +
                (className || "")
            }
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                        {index > 0 && (
                            <ChevronRight size={13} className="shrink-0 text-slate-700" />
                        )}

                        {item.to && !isLast ? (
                            <Link
                                to={item.to}
                                className="transition hover:text-violet-300"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className={isLast ? "font-medium text-slate-300" : ""}>
                                {item.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

export default Breadcrumbs;
