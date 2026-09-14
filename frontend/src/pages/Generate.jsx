import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../components/ui/PageHeader";
import GenerateForm from "../components/generate/GenerateForm";
import TemplatePresets from "../components/generate/TemplatePresets";

/* ==========================================================
   Generate — composer page. On success we hand the thread id
   to the live workflow screen via router state.

   Layout: gradient hero fused to the form card (≈2/3) plus
   the Template Presets rail (≈1/3).
========================================================== */

const CRUMBS = [{ label: "Home", to: "/" }, { label: "Generate" }];

function Generate() {
    const navigate = useNavigate();

    /* `token` makes re-picking the same template re-apply */
    const [preset, setPreset] = useState(null);

    function handleGenerationStarted(threadId, userGoal) {
        navigate("/generation", { state: { threadId, userGoal } });
    }

    function prefill(template) {
        setPreset({ ...template, token: `${template.id}-${Date.now()}` });
    }

    return (
        <div className="space-y-7">
            <PageHeader
                crumbs={CRUMBS}
                eyebrow="New Workflow"
                title="Generate"
                description="Research, Marketing, Finance, Coding and File Generation run autonomously and stream back every step."
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* ---------------- Composer ---------------- */}
                <div className="min-w-0">
                    <div className="hero-banner p-6 sm:p-8">
                        <div className="flex items-start gap-5">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl sm:h-16 sm:w-16">
                                🚀
                            </span>

                            <div className="min-w-0">
                                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                                    Create a New AI Startup
                                </h2>

                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                                    Turn your ideas into real opportunities. Describe your
                                    startup idea and let AI handle the rest.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="panel -mt-3 rounded-t-none p-5 sm:p-8">
                        <GenerateForm
                            key={preset?.token || "blank"}
                            onSuccess={handleGenerationStarted}
                            preset={preset}
                        />
                    </div>
                </div>

                {/* ---------------- Presets ---------------- */}
                <TemplatePresets onUse={prefill} />
            </div>
        </div>
    );
}

export default Generate;
