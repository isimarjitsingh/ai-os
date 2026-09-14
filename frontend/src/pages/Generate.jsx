import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import GenerateForm from "../components/generate/GenerateForm";

/* ==========================================================
   Generate — composer page. On success we hand the thread id
   to the live workflow screen via router state.
========================================================== */

function Generate() {
    const navigate = useNavigate();

    function handleGenerationStarted(threadId, userGoal) {
        navigate("/generation", { state: { threadId, userGoal } });
    }

    return (
        <div className="mx-auto max-w-6xl space-y-7">
            <PageHeader
                eyebrow="New Workflow"
                title={
                    <>
                        Create a new{" "}
                        <span className="gradient-text">AI startup</span>
                    </>
                }
                description="Describe the idea in plain English. Research, Marketing, Finance, Coding and File Generation then run autonomously and stream back every step."
            />

            <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                    <Sparkles size={15} className="text-violet-300" />
                </span>

                <p className="text-xs leading-relaxed text-slate-400">
                    This posts to{" "}
                    <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">
                        POST /generate
                    </code>{" "}
                    and immediately opens the live agent console for your thread.
                </p>
            </div>

            <GenerateForm onSuccess={handleGenerationStarted} />
        </div>
    );
}

export default Generate;
