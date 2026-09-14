import { FileText } from "lucide-react";

import { parseReportValue, titleCase } from "../../lib/format";

/* ==========================================================
   Field maps — exactly the columns exposed by
   Backend/database/models.py for each report table.
========================================================== */

const REPORT_FIELDS = {
    research: [
        "market_overview",
        "target_audience",
        "competitors",
        "key_features",
        "opportunities",
        "risks",
    ],
    marketing: [
        "marketing_summary",
        "positioning",
        "target_channels",
        "launch_strategy",
        "content_ideas",
        "kpis",
    ],
    finance: [
        "startup_cost",
        "monthly_cost",
        "revenue_model",
        "pricing_strategy",
        "financial_risks",
        "break_even_estimate",
    ],
    coding: [
        "tech_stack",
        "frontend",
        "backend",
        "database",
        "architecture",
        "core_features",
        "api_endpoints",
        "development_steps",
        "system_architecture",
    ],
    ceo: [
        "executive_summary",
        "business_viability",
        "target_market",
        "unique_value_proposition",
        "recommended_mvp",
        "recommended_tech_stack",
        "launch_strategy",
        "estimated_budget",
        "major_risks",
        "next_steps",
    ],
};

/* Long-form prose fields render as paragraphs, not bullets */
const PROSE = new Set([
    "market_overview",
    "marketing_summary",
    "positioning",
    "architecture",
    "system_architecture",
    "executive_summary",
    "business_viability",
    "unique_value_proposition",
    "recommended_mvp",
    "revenue_model",
    "pricing_strategy",
    "launch_strategy",
    "break_even_estimate",
]);

/* ---------- value renderers ---------- */

function TextBlock({ text }) {
    return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {text}
        </p>
    );
}

function ListBlock({ items }) {
    return (
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />

                    <span className="text-sm leading-relaxed text-slate-300">
                        {typeof item === "object" && item !== null
                            ? Object.entries(item)
                                  .map(([key, value]) => `${titleCase(key)}: ${value}`)
                                  .join(" · ")
                            : String(item)}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function ObjectBlock({ value }) {
    const entries = Object.entries(value);

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {entries.map(([key, item]) => (
                <div
                    key={key}
                    className="rounded-xl border border-slate-400/10 bg-black/25 p-3.5"
                >
                    <p className="eyebrow mb-1 text-[10px]">{titleCase(key)}</p>

                    <p className="text-sm leading-relaxed text-slate-300">
                        {typeof item === "object"
                            ? JSON.stringify(item)
                            : String(item)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function Value({ field, raw }) {
    const parsed = parseReportValue(raw);

    if (parsed.kind === "empty") {
        return <p className="text-sm italic text-slate-600">Not reported</p>;
    }

    if (parsed.kind === "list") return <ListBlock items={parsed.data} />;
    if (parsed.kind === "object") return <ObjectBlock value={parsed.data} />;

    return PROSE.has(field) ? <TextBlock text={parsed.data} /> : <TextBlock text={parsed.data} />;
}

/* ==========================================================
   ReportView
========================================================== */

function ReportView({ agent, report, title }) {
    const fields = REPORT_FIELDS[agent] || [];

    if (!report) {
        return (
            <div className="panel flex flex-col items-center justify-center gap-3 p-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-400/10 ring-1 ring-inset ring-slate-400/15">
                    <FileText size={20} className="text-slate-500" />
                </span>

                <p className="text-sm font-semibold text-slate-300">
                    No {title || agent} report yet
                </p>

                <p className="max-w-sm text-xs text-slate-500">
                    This section populates once the workflow finishes and the
                    report is persisted for this project.
                </p>
            </div>
        );
    }

    const visible = fields.filter((field) => report[field] !== undefined);
    const used = visible.length > 0 ? visible : fields;

    return (
        <div className="space-y-4">
            {used.map((field) => (
                <section
                    key={field}
                    className="panel p-5 sm:p-6"
                >
                    <h3 className="mb-3 flex items-center gap-2.5 text-sm font-bold text-slate-100">
                        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500" />
                        {titleCase(field)}
                    </h3>

                    <Value field={field} raw={report[field]} />
                </section>
            ))}
        </div>
    );
}

export default ReportView;
