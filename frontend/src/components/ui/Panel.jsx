import { cn } from "../../lib/cn";

/* ==========================================================
   Panel — the fundamental dark surface used everywhere.
========================================================== */

function Panel({
    as: Tag = "section",
    interactive = false,
    padded = true,
    title,
    subtitle,
    icon: Icon,
    action,
    children,
    className,
    bodyClassName,
    ...rest
}) {
    const hasHeader = Boolean(title || action || subtitle);

    return (
        <Tag
            className={cn(
                "panel flex flex-col",
                interactive && "panel-interactive",
                className
            )}
            {...rest}
        >
            {hasHeader && (
                <header className="flex items-start justify-between gap-4 border-b border-slate-400/10 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        {Icon && (
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-inset ring-violet-400/25">
                                <Icon size={17} className="text-violet-300" />
                            </span>
                        )}

                        <div className="min-w-0">
                            {title && (
                                <h2 className="truncate text-base font-bold text-slate-100">
                                    {title}
                                </h2>
                            )}

                            {subtitle && (
                                <p className="mt-0.5 truncate text-sm text-slate-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {action && (
                        <div className="shrink-0">{action}</div>
                    )}
                </header>
            )}

            <div
                className={cn(
                    padded && "p-5 sm:p-6",
                    "min-w-0 flex-1",
                    bodyClassName
                )}
            >
                {children}
            </div>
        </Tag>
    );
}

export default Panel;
