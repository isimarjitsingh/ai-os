import { FileText, ArrowRight } from "lucide-react";

import { TEMPLATES } from "../../lib/templates";
import { cn } from "../../lib/cn";

/* ==========================================================
   TemplatePresets — the rail beside the composer.

   The mockups show a plain panel ("Start from a template /
   Choose a focused workflow") holding compact selectable cards,
   so the whole card is the button rather than a small link
   tucked under a tag row.

   Data lives in lib/templates.js; the picked template travels
   up through onUse and Generate keys the form on it.
========================================================== */

function TemplatePresets({ onUse, activeId }) {
    return (
        <aside className="panel flex min-w-0 flex-col p-5 xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-start gap-3">
                <span className="tile tile-brand h-9 w-9 shrink-0 rounded-lg">
                    <FileText size={16} />
                </span>

                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-100">
                        Start from a template
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">Choose a focused workflow.</p>
                </div>
            </div>

            <ul className="mt-5 space-y-3">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isActive = template.id === activeId;

                    return (
                        <li key={template.id}>
                            <button
                                type="button"
                                onClick={() => onUse?.(template)}
                                aria-pressed={isActive}
                                className={cn(
                                    "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition",
                                    isActive
                                        ? "border-violet-400/50 bg-violet-500/[0.08]"
                                        : "border-[var(--color-line)] bg-white/[0.02] hover:border-violet-400/35 hover:bg-white/[0.04]"
                                )}
                            >
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                        background: `${template.accent}1f`,
                                        color: template.accent,
                                    }}
                                >
                                    <Icon size={16} />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-100">
                                        {template.title}
                                    </span>

                                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                                        {template.blurb}
                                    </span>
                                </span>

                                {isActive && (
                                    <ArrowRight
                                        size={14}
                                        className="mt-1 shrink-0 text-violet-300"
                                    />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-xs leading-relaxed text-slate-600">
                Picking a template fills the idea, industry, project type and requirements
                fields above.
            </p>
        </aside>
    );
}

export default TemplatePresets;
