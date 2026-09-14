import {
    CheckCircle2,
    CircleDashed,
    Wallet,
    Layers,
    Target,
    Sparkles,
} from "lucide-react";

import { AGENT_BY_ID } from "../../lib/agents";
import { parseReportValue, titleCase } from "../../lib/format";

/* ==========================================================
   OverviewPanel — the landing tab of a project.
========================================================== */

function MiniStat({ icon: Icon, label, value }) {
    const parsed = parseReportValue(value);

    return (
        <div className="panel-flat p-4">
            <div className="flex items-center gap-2">
                <Icon size={14} className="shrink-0 text-violet-300" />
                <p className="eyebrow truncate text-[10px]">{label}</p>
            </div>

            <p className="mt-2.5 line-clamp-3 text-sm font-medium leading-snug text-slate-200">
                {parsed.kind === "empty" ? "—" : parsed.data}
            </p>
        </div>
    );
}

function OverviewPanel({ project, reports, fileCount }) {
    const ceo = reports.ceo;
    const finance = reports.finance;
    const coding = reports.coding;

    const sections = ["research", "marketing", "finance", "coding", "ceo"];

    const stack = parseReportValue(coding?.tech_stack);

    const stackItems =
        stack.kind === "list"
            ? stack.data
            : stack.kind === "object"
            ? Object.values(stack.data).flat()
            : stack.kind === "text"
            ? stack.data.split(/[,\n]/).map((part) => part.trim()).filter(Boolean)
            : [];

    return (
        <div className="space-y-5">
            {/* ---------- Executive summary ---------- */}
            <div className="panel relative overflow-hidden p-6 sm:p-7">
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(30rem 16rem at 0% 0%, rgba(124,58,237,0.18), transparent 65%)",
                    }}
                />

                <div className="relative">
                    <p className="flex items-center gap-2 eyebrow">
                        <Sparkles size={12} className="text-violet-300" />
                        CEO Verdict
                    </p>

                    <h2 className="mt-2.5 text-lg font-bold text-slate-50">
                        {ceo?.business_viability
                            ? titleCase(String(ceo.business_viability).slice(0, 60))
                            : project?.project_name || "Executive Summary"}
                    </h2>

                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                        {ceo?.executive_summary ||
                            "The executive summary appears here once the CEO agent finalises the run."}
                    </p>
                </div>
            </div>

            {/* ---------- Money ---------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MiniStat icon={Wallet} label="Startup Cost" value={finance?.startup_cost} />
                <MiniStat icon={Layers} label="Monthly Cost" value={finance?.monthly_cost} />
                <MiniStat icon={Target} label="Break Even" value={finance?.break_even_estimate} />
            </div>

            {/* ---------- Readiness + stack ---------- */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="panel p-6">
                    <h3 className="text-sm font-bold text-slate-100">
                        Report Coverage
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Which departments produced output
                    </p>

                    <ul className="mt-5 space-y-2.5">
                        {sections.map((id) => {
                            const agent = AGENT_BY_ID[id];
                            const report = reports[id];

                            const fieldKeys = report
                                ? Object.keys(report).filter(
                                      (key) => key !== "id" && key !== "project_id"
                                  )
                                : [];

                            const filled = fieldKeys.filter(
                                (field) =>
                                    parseReportValue(report[field]).kind !== "empty"
                            ).length;

                            const Icon = agent?.icon;

                            return (
                                <li
                                    key={id}
                                    className="flex items-center gap-3 rounded-xl border border-slate-400/10 bg-white/[0.02] px-3.5 py-2.5"
                                >
                                    {report ? (
                                        <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                                    ) : (
                                        <CircleDashed size={15} className="shrink-0 text-slate-600" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-slate-200">
                                            {agent?.name || titleCase(id)}
                                        </p>
                                        <p className="truncate text-[11px] text-slate-500">
                                            {filled}/{fieldKeys.length} fields populated
                                        </p>
                                    </div>

                                    {Icon && (
                                        <Icon size={14} className="shrink-0 text-slate-600" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="panel p-6">
                    <h3 className="text-sm font-bold text-slate-100">Tech Stack</h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Chosen by the coding agent
                    </p>

                    {stackItems.length === 0 ? (
                        <p className="mt-5 text-sm italic text-slate-600">
                            No stack recorded yet.
                        </p>
                    ) : (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {stackItems.slice(0, 24).map((item, index) => (
                                <span
                                    key={`${item}-${index}`}
                                    className="rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200 ring-1 ring-inset ring-violet-400/20"
                                >
                                    {typeof item === "object"
                                        ? JSON.stringify(item)
                                        : String(item)}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-400/10 pt-4">
                        <span className="text-xs text-slate-500">Generated files</span>

                        <span className="text-sm font-bold text-slate-200">
                            {fileCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* ---------- Idea ---------- */}
            <div className="panel p-6">
                <h3 className="text-sm font-bold text-slate-100">Original Brief</h3>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                    {project?.startup_idea || "No brief recorded."}
                </p>
            </div>
        </div>
    );
}

export default OverviewPanel;

