import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";

import GenerateForm from "../components/generate/GenerateForm";
import TemplatePresets from "../components/generate/TemplatePresets";

/* ==========================================================
   Generate — composer page. On success we hand the thread id
   to the live workflow screen via router state.

   The page title lives in the masthead, so the body is just the
   two columns from the reference: the composer (≈2/3) opening
   with "Start with an idea", and the template rail (≈1/3).
========================================================== */

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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* ---------------- Composer ---------------- */}
            <div className="panel min-w-0 p-5 sm:p-7">
                <div className="flex items-start gap-4">
                    <span className="tile tile-brand h-11 w-11 shrink-0 rounded-xl">
                        <Lightbulb size={19} />
                    </span>

                    <div className="min-w-0">
                        <p className="section-label">Start with an idea</p>

                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                            What should your company build?
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                            Describe the outcome you want. Your agents will research, plan,
                            validate, and prepare the next steps.
                        </p>
                    </div>
                </div>

                <div className="mt-7">
                    <GenerateForm
                        key={preset?.token || "blank"}
                        onSuccess={handleGenerationStarted}
                        preset={preset}
                    />
                </div>
            </div>

            {/* ---------------- Presets ---------------- */}
            <TemplatePresets onUse={prefill} activeId={preset?.id} />
        </div>
    );
}

export default Generate;
