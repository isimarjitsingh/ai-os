import { useState } from "react";
import { Rocket, Loader2, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

import { generateProject } from "../../services/api";
import Panel from "../ui/Panel";

/* ==========================================================
   GenerateForm
   Builds the user_goal string the CEO planner expects and
   POSTs it to /generate, then hands back the thread id.
========================================================== */

const INDUSTRIES = [
    "SaaS",
    "Healthcare",
    "Finance",
    "Education",
    "AI",
    "E-Commerce",
    "Cyber Security",
    "Travel",
];

const PROJECT_TYPES = [
    "Web Application",
    "Mobile Application",
    "Desktop Application",
    "REST API",
    "Chrome Extension",
];

const EXAMPLES = [
    "An AI SaaS that turns voice notes into structured CRM records for field sales teams.",
    "A marketplace where independent mechanics sell verified service packages.",
    "A compliance copilot that drafts GDPR data-processing agreements.",
];

function buildGoal({ idea, industry, projectType, requirements }) {
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
    ].join("\n");
}

function GenerateForm({ onSuccess }) {
    const [idea, setIdea] = useState("");
    const [industry, setIndustry] = useState("SaaS");
    const [projectType, setProjectType] = useState("Web Application");
    const [requirements, setRequirements] = useState("");
    const [loading, setLoading] = useState(false);

    const trimmed = idea.trim();
    const progress = Math.min(100, Math.round((trimmed.length / 120) * 100));

    async function handleGenerate() {
        if (!trimmed) {
            toast.error("Describe your startup idea first.");
            return;
        }

        if (trimmed.length < 12) {
            toast.error("Give the agents a little more detail (min 12 characters).");
            return;
        }

        setLoading(true);

        try {
            const userGoal = buildGoal({ idea, industry, projectType, requirements });

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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Composer */}
            <div className="panel p-6 xl:col-span-2 sm:p-7">
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="field-label mb-0" htmlFor="idea">
                                Startup Idea
                            </label>

                            <span className="text-[11px] text-slate-600">
                                {trimmed.length} chars
                            </span>
                        </div>

                        <textarea
                            id="idea"
                            rows={6}
                            value={idea}
                            onChange={(event) => setIdea(event.target.value)}
                            placeholder="Example: Build an AI SaaS platform that creates complete software startups using autonomous AI agents."
                            className="field mt-3 resize-y leading-relaxed"
                        />

                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-400/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <span className="text-[11px] text-slate-600">
                                {progress < 40
                                    ? "Add more detail"
                                    : progress < 100
                                    ? "Looking good"
                                    : "Great detail"}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="field-label" htmlFor="industry">
                                Industry
                            </label>

                            <select
                                id="industry"
                                value={industry}
                                onChange={(event) => setIndustry(event.target.value)}
                                className="field"
                            >
                                {INDUSTRIES.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="field-label" htmlFor="project-type">
                                Project Type
                            </label>

                            <select
                                id="project-type"
                                value={projectType}
                                onChange={(event) => setProjectType(event.target.value)}
                                className="field"
                            >
                                {PROJECT_TYPES.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="field-label" htmlFor="requirements">
                            Additional Requirements
                            <span className="ml-2 font-normal normal-case tracking-normal text-slate-600">
                                optional
                            </span>
                        </label>

                        <textarea
                            id="requirements"
                            rows={4}
                            value={requirements}
                            onChange={(event) => setRequirements(event.target.value)}
                            placeholder="Authentication, Stripe payments, AI chatbot, dashboard, analytics…"
                            className="field resize-y leading-relaxed"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
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
                                Generate Startup
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ---------- Guidance ---------- */}
            <aside className="space-y-5">
                <Panel title="Try one of these" icon={Lightbulb} padded={false}>
                    <ul className="space-y-2 p-4">
                        {EXAMPLES.map((example) => (
                            <li key={example}>
                                <button
                                    type="button"
                                    onClick={() => setIdea(example)}
                                    className="w-full rounded-xl border border-slate-400/10 bg-white/[0.02] p-3.5 text-left text-xs leading-relaxed text-slate-400 transition hover:border-violet-400/40 hover:bg-violet-500/5 hover:text-slate-200"
                                >
                                    {example}
                                </button>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </aside>
        </div>
    );
}

export default GenerateForm;

