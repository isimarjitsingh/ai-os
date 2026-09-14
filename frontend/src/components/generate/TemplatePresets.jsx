import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Panel from "../ui/Panel";
import { TEMPLATES } from "../../lib/templates";

/* ==========================================================
   TemplatePresets — curated starter briefs shown in the rail
   beside the composer. Data lives in lib/templates.js; the
   picked template travels up through onUse.
========================================================== */

function TemplatePresets({ onUse }) {
    return (
        <Panel
            title="Template Presets"
            subtitle="Get inspired by these curated startup ideas."
            padded={false}
            className="xl:sticky xl:top-24"
        >
            <ul className="space-y-3 p-4">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon;

                    return (
                        <li
                            key={template.id}
                            className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-4 transition hover:border-violet-400/40 hover:bg-violet-500/[0.04]"
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                    style={{
                                        background: `${template.accent}1f`,
                                        color: template.accent,
                                    }}
                                >
                                    <Icon size={18} />
                                </span>

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-100">
                                        {template.title}
                                    </p>

                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                        {template.blurb}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {template.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="chip chip-idle !px-2 !py-0.5 !text-[11px]"
                                    >
                                        {tag}
                                    </span>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => onUse?.(template)}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                                >
                                    Use template
                                    <ArrowRight size={12} />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="border-t border-[var(--color-line)] px-5 py-3.5">
                <Link
                    to="/knowledge"
                    className="text-xs text-slate-500 transition hover:text-violet-300"
                >
                    Browse the knowledge library →
                </Link>
            </div>
        </Panel>
    );
}

export default TemplatePresets;
