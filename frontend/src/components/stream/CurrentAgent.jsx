import { Loader2, Brain, CheckCircle2, Clock3 } from "lucide-react";

function CurrentAgent({

    agent,

    message,

    finished = false

}) {

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">

                <h2 className="text-xl font-bold text-slate-900">
                    Current Agent
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Live execution status
                </p>

            </div>

            <div className="flex items-center gap-5">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">

                    <Brain
                        size={32}
                        className="text-violet-600"
                    />

                </div>

                <div className="flex-1">

                    <div className="flex items-center gap-3">

                        <h3 className="text-xl font-semibold text-slate-900">

                            {
                                finished
                                    ? "Workflow Completed"
                                    : agent || "Waiting"
                            }

                        </h3>

                        {

                            finished ? (

                                <CheckCircle2
                                    size={20}
                                    className="text-green-600"
                                />

                            ) : agent ? (

                                <Loader2
                                    size={18}
                                    className="animate-spin text-violet-600"
                                />

                            ) : (

                                <Clock3
                                    size={18}
                                    className="text-slate-400"
                                />

                            )

                        }

                    </div>

                    <p className="mt-2 text-slate-500">

                        {
                            finished
                                ? "All AI agents have completed successfully."
                                : message || "Waiting for workflow..."
                        }

                    </p>

                </div>

            </div>

            <div
                className={`mt-6 rounded-xl p-4 ${
                    finished
                        ? "bg-green-50"
                        : agent
                        ? "bg-violet-50"
                        : "bg-slate-50"
                }`}
            >

                <div className="flex items-center gap-2">

                    <div
                        className={`h-2.5 w-2.5 rounded-full ${
                            finished
                                ? "bg-green-500"
                                : agent
                                ? "animate-pulse bg-violet-600"
                                : "bg-slate-400"
                        }`}
                    />

                    <span
                        className={`text-sm font-medium ${
                            finished
                                ? "text-green-700"
                                : agent
                                ? "text-violet-700"
                                : "text-slate-500"
                        }`}
                    >

                        {
                            finished
                                ? "Workflow completed successfully."
                                : agent
                                ? "Agent is currently processing..."
                                : "Waiting for workflow to start..."
                        }

                    </span>

                </div>

            </div>

        </div>

    );

}

export default CurrentAgent;