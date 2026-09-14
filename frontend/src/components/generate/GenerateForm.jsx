import { useState } from "react";
import { Building2, Layers, Loader2, Rocket } from "lucide-react";
import toast from "react-hot-toast";

import { generateProject } from "../../services/api";
import { readPrefs } from "../../lib/prefs";
import { INDUSTRIES, PROJECT_TYPES } from "../../lib/industries";
import { cn } from "../../lib/cn";
import Switch from "../ui/Switch";

/* ==========================================================
   GenerateForm
   Builds the user_goal string the CEO planner expects and
   POSTs it to /generate, then hands back the thread id.

   `preset` — a TemplatePresets payload with a changing `token`
   so re-picking the same template still re-applies.
========================================================== */

const IDEA_MAX = 2000;
const REQ_MAX = 1000;

const ADVANCED = [
    {
        key: "autoAssign",
        title: "Auto-assign agents",
        hint: "Let the CEO route work to the right departments.",
    },
    {
        key: "pitchDeck",
        title: "Generate pitch deck",
        hint: "Add an investor-ready deck outline to the output.",
    },
    {
        key: "financialModel",
        title: "Create financial model",
        hint: "Extend the finance report with 24-month projections.",
    },
];

function buildGoal({ idea, industry, projectType, requirements, advanced }) {
    const extras = [
        advanced.autoAssign && "Auto-assign the most suitable agents and departments.",
        advanced.pitchDeck && "Include an investor pitch deck outline.",
        advanced.financialModel &&
            "Include a financial model with 24-month revenue and cost projections.",
    ].filter(Boolean);

    return [
        "Startup Idea:",
        idea.trim(),
        "",
        "Industry:",
        industry,
        "",
        "Project Type:",
        projectType,
        "",
        "Additional Requirements:",
        requirements.trim() || "None specified.",
        "",
        "Advanced Options:",
        extras.length ? extras.join("\n") : "None selected.",
    ].join("\n");
}

function GenerateForm({ onSuccess, preset }) {
    const [prefs] = useState(() => readPrefs());

    /* Picking a template remounts this form — the parent keys it on
       preset.token — so a preset only ever needs to be an initial
       value. That keeps this render pure (no setState in effects). */
    const [idea, setIdea] = useState(preset?.idea || "");
    const [industry, setIndustry] = useState(preset?.industry || prefs.defaultIndustry);
    const [projectType, setProjectType] = useState(
        preset?.projectType || prefs.defaultProjectType
    );
    const [requirements, setRequirements] = useState(preset?.requirements || "");
    const [advanced, setAdvanced] = useState({
        autoAssign: true,
        pitchDeck: false,
        financialModel: false,
    });
    const [loading, setLoading] = useState(false);

    const trimmed = idea.trim();
    const ready = trimmed.length >= 12;

    async function handleSubmit(event) {
        event.preventDefault();

        if (!trimmed) {
            toast.error("Describe your startup idea first.");
            return;
        }

        if (!ready) {
            toast.error("Give the agents a little more detail (min 12 characters).");
            return;
        }

        setLoading(true);

        try {
            const userGoal = buildGoal({
                idea,
                industry,
                projectType,
                requirements,
                advanced,
            });

            const result = await generateProject(userGoal);

            if (!result?.thread_id) {
                throw new Error("Backend did not return a thread id.");
            }

            toast.success("Workflow started — agents are live.");
            onSuccess(result.thread_id, userGoal);
        } catch (error) {
            toast.error(error.message || "Failed to start the workflow.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ---------------- Startup idea ---------------- */}
            <div>
                <label className="field-label" htmlFor="idea">
                    Startup Idea
                </label>

                <div className="relative">
                    <textarea
                        id="idea"
                        rows={5}
                        maxLength={IDEA_MAX}
                        value={idea}
                        onChange={(event) => setIdea(event.target.value)}
                        placeholder="An AI SaaS that turns voice notes into structured CRM records for field sales teams…"
                        className="field resize-y leading-relaxed pb-9"
                    />

                    <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[11px] tabular-nums text-slate-600">
                        {idea.length}/{IDEA_MAX}
                    </span>
                </div>

                <p className="mt-2 text-xs text-slate-600">
                    {ready
                        ? "Detailed enough — the CEO agent will plan from this."
                        : `Add ${Math.max(0, 12 - trimmed.length)} more characters to start.`}
                </p>
            </div>

            {/* ---------------- Industry + project type ---------------- */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="field-label" htmlFor="industry">
                        Industry
                    </label>

                    <div className="relative">
                        <Building2
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <select
                            id="industry"
                            value={industry}
                            onChange={(event) => setIndustry(event.target.value)}
                            className="field pl-10"
                        >
                            {INDUSTRIES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="field-label" htmlFor="project-type">
                        Project Type
                    </label>

                    <div className="relative">
                        <Layers
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <select
                            id="project-type"
                            value={projectType}
                            onChange={(event) => setProjectType(event.target.value)}
                            className="field pl-10"
                        >
                            {PROJECT_TYPES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ---------------- Requirements ---------------- */}
            <div>
                <label className="field-label" htmlFor="requirements">
                    Additional Requirements
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-600">
                        optional
                    </span>
                </label>

                <div className="relative">
                    <textarea
                        id="requirements"
                        rows={3}
                        maxLength={REQ_MAX}
                        value={requirements}
                        onChange={(event) => setRequirements(event.target.value)}
                        placeholder="Authentication, Stripe payments, AI chatbot, dashboard, analytics…"
                        className="field resize-y leading-relaxed pb-9"
                    />

                    <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[11px] tabular-nums text-slate-600">
                        {requirements.length}/{REQ_MAX}
                    </span>
                </div>
            </div>

            {/* ---------------- Advanced options ---------------- */}
            <div>
                <p className="field-label">Advanced Options</p>

                <div className="grid gap-3 sm:grid-cols-3">
                    {ADVANCED.map((option) => {
                        const on = advanced[option.key];

                        return (
                            <div
                                key={option.key}
                                className={cn(
                                    "rounded-2xl border p-4 transition",
                                    on
                                        ? "border-violet-400/40 bg-violet-500/[0.06]"
                                        : "border-[var(--color-line)] bg-white/[0.02]"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-semibold leading-snug text-slate-200">
                                        {option.title}
                                    </p>

                                    <Switch
                                        checked={on}
                                        label={option.title}
                                        onChange={(next) =>
                                            setAdvanced((prev) => ({
                                                ...prev,
                                                [option.key]: next,
                                            }))
                                        }
                                    />
                                </div>

                                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                    {option.hint}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-2.5 text-xs text-slate-600">
                    Selections are appended to the brief the CEO agent plans from.
                </p>
            </div>

            {/* ---------------- Submit ---------------- */}
            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-base"
            >
                {loading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Starting AI workflow…
                    </>
                ) : (
                    <>
                        <Rocket size={19} />
                        Generate Startup →
                    </>
                )}
            </button>


        </form>
    );
}

export default GenerateForm;
