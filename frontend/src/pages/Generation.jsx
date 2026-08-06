import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import useGeneration from "../hooks/UseGeneration";

import AgentProgress from "../components/stream/AgentProgress";

function Generation() {

    const location = useLocation();

    const navigate = useNavigate();

    const {

        threadId,

        userGoal

    } = location.state || {};

    const {

        events,

        statuses,

        completed,

        total,

        currentAgent,

        finished

    } = useGeneration(

        threadId,

        userGoal

    );

useEffect(() => {

    if (finished) {

        setTimeout(() => {

            navigate(`/project/${threadId}`);

        }, 1200);

    }

}, [
    finished,
    navigate,
    threadId
]);


    if (!threadId) {

        return (

            <div className="flex h-screen items-center justify-center">

                <div className="rounded-3xl bg-white p-10 shadow">

                    <h2 className="text-2xl font-bold">

                        Invalid Workflow

                    </h2>

                    <button

                        onClick={() => navigate("/generate")}

                        className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-white"

                    >

                        Start Again

                    </button>

                </div>

            </div>

        );

    }

    return (

        <div className="mx-auto max-w-7xl space-y-8">

            {/* Header */}

            <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 text-white shadow-xl">

                <p className="text-violet-100">

                    AI Company OS

                </p>

                <h1 className="mt-2 text-4xl font-bold">

                    Building Your Startup

                </h1>

                <p className="mt-4 max-w-4xl text-violet-100">

                    {userGoal}

                </p>

            </div>

            {/* Layout */}

            <div className="grid gap-8 xl:grid-cols-3">

                {/* Left */}

                <div className="space-y-8 xl:col-span-2">

                    <AgentProgress
                        completed={completed}
                        total={total}
                        currentAgent={currentAgent}
                        finished={finished}
                        statuses={statuses}
                    />

                </div>

                {/* Right */}

                

            </div>

            {

                finished && (

                    <div className="rounded-3xl border border-green-300 bg-green-50 p-6 text-center">

                        <h2 className="text-3xl font-bold text-green-700">

                            🎉 Startup Generated Successfully

                        </h2>

                        <p className="mt-2 text-green-600">

                            Preparing project dashboard...

                        </p>

                    </div>

                )

            }

        </div>

    );

}

export default Generation;