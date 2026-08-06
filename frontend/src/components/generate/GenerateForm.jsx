import { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";

import { generateProject } from "../../services/api";

function GenerateForm({ onSuccess }) {

    const [idea, setIdea] = useState("");

    const [industry, setIndustry] = useState("SaaS");

    const [projectType, setProjectType] = useState("Web Application");

    const [requirements, setRequirements] = useState("");

    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {

        if (!idea.trim()) {

            alert("Please enter your startup idea.");

            return;

        }

        try {

            setLoading(true);

            const userGoal = `

Startup Idea:
${idea}

Industry:
${industry}

Project Type:
${projectType}

Additional Requirements:
${requirements}

`;

            const result = await generateProject(userGoal);

            onSuccess(
                result.thread_id,
                userGoal
            );

        }

        catch (error) {

            console.error(error);

            alert("Failed to start workflow.");

        }

        finally {

            setLoading(false);

        }

    };

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

            <div className="space-y-7">

                {/* Startup Idea */}

                <div>

                    <label className="mb-3 block text-sm font-semibold text-slate-700">

                        Startup Idea

                    </label>

                    <textarea

                        rows={6}

                        value={idea}

                        onChange={(e) => setIdea(e.target.value)}

                        placeholder="Example: Build an AI SaaS platform that creates complete software startups using autonomous AI agents."

                        className="w-full rounded-xl border border-slate-300 p-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"

                    />

                </div>

                {/* Industry & Project Type */}

                <div className="grid gap-6 md:grid-cols-2">

                    <div>

                        <label className="mb-3 block text-sm font-semibold text-slate-700">

                            Industry

                        </label>

                        <select

                            value={industry}

                            onChange={(e) => setIndustry(e.target.value)}

                            className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"

                        >

                            <option>SaaS</option>

                            <option>Healthcare</option>

                            <option>Finance</option>

                            <option>Education</option>

                            <option>AI</option>

                            <option>E-Commerce</option>

                            <option>Cyber Security</option>

                            <option>Travel</option>

                        </select>

                    </div>

                    <div>

                        <label className="mb-3 block text-sm font-semibold text-slate-700">

                            Project Type

                        </label>

                        <select

                            value={projectType}

                            onChange={(e) => setProjectType(e.target.value)}

                            className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"

                        >

                            <option>Web Application</option>

                            <option>Mobile Application</option>

                            <option>Desktop Application</option>

                            <option>REST API</option>

                            <option>Chrome Extension</option>

                        </select>

                    </div>

                </div>

                {/* Additional Requirements */}

                <div>

                    <label className="mb-3 block text-sm font-semibold text-slate-700">

                        Additional Requirements

                    </label>

                    <textarea

                        rows={5}

                        value={requirements}

                        onChange={(e) => setRequirements(e.target.value)}

                        placeholder="Authentication, Stripe payments, AI chatbot, Dashboard, Analytics..."

                        className="w-full rounded-xl border border-slate-300 p-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"

                    />

                </div>

                {/* Button */}

                <button

                    onClick={handleGenerate}

                    disabled={loading}

                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-400"

                >

                    {

                        loading

                        ?

                        <Loader2
                            size={22}
                            className="animate-spin"
                        />

                        :

                        <Rocket size={22} />

                    }

                    {

                        loading

                        ?

                        "Starting AI Workflow..."

                        :

                        "Generate Startup"

                    }

                </button>

            </div>

        </div>

    );

}

export default GenerateForm;