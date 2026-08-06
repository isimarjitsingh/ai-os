import { useNavigate } from "react-router-dom";

import GenerateForm from "../components/generate/GenerateForm";

function Generate() {

    const navigate = useNavigate();

    const handleGenerationStarted = (threadId, userGoal) => {

        navigate("/generation", {

            state: {

                threadId,

                userGoal

            }

        });

    };

    return (

        <div className="mx-auto max-w-6xl space-y-8">

            {/* Hero */}

            <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-10 text-white shadow-xl">

                <span className="rounded-full bg-white/15 px-4 py-2 text-sm">

                    AI Company OS

                </span>

                <h1 className="mt-5 text-5xl font-bold">

                    Create a New AI Startup

                </h1>

                <p className="mt-4 max-w-3xl text-lg text-violet-100">

                    Describe your startup idea in plain English.

                    AI Company OS will automatically execute Research,

                    Marketing, Finance, Coding and File Generation

                    using autonomous AI agents.

                </p>

            </div>

            {/* Form */}

            <GenerateForm

                onSuccess={handleGenerationStarted}

            />

        </div>

    );

}

export default Generate;