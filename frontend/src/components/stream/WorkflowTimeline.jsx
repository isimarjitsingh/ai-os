import {
    Brain,
    Search,
    Megaphone,
    DollarSign,
    Code2,
    FolderGit2,
    CheckCircle2,
    Loader2,
    Clock3
} from "lucide-react";

const AGENTS = [

    {
        id: "ceo",
        name: "CEO Agent",
        icon: Brain
    },

    {
        id: "research",
        name: "Research Agent",
        icon: Search
    },

    {
        id: "marketing",
        name: "Marketing Agent",
        icon: Megaphone
    },

    {
        id: "finance",
        name: "Finance Agent",
        icon: DollarSign
    },

    {
        id: "coding",
        name: "Coding Agent",
        icon: Code2
    },

    {
        id: "file_generator",
        name: "File Generator",
        icon: FolderGit2
    }

];

function StatusIcon({ status }) {

    if (status === "completed") {

        return (
            <CheckCircle2
                size={20}
                className="text-green-600"
            />
        );

    }

    if (status === "running") {

        return (
            <Loader2
                size={20}
                className="animate-spin text-violet-600"
            />
        );

    }

    return (
        <Clock3
            size={20}
            className="text-slate-400"
        />
    );

}

function StatusBadge({ status }) {

    if (status === "completed") {

        return (

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">

                Completed

            </span>

        );

    }

    if (status === "running") {

        return (

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">

                Running

            </span>

        );

    }

    return (

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">

            Waiting

        </span>

    );

}

function WorkflowTimeline({

    statuses = {}

}) {

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

                <h2 className="text-xl font-bold text-slate-900">

                    Workflow Timeline

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                    Real-time execution of every AI department

                </p>

            </div>

            <div className="space-y-4">

                {

                    AGENTS.map((agent) => {

                        const Icon = agent.icon;

                        const status = statuses[agent.id] || "waiting";

                        return (

                            <div

                                key={agent.id}

                                className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:bg-slate-50"

                            >

                                <div className="flex items-center gap-4">

                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">

                                        <Icon

                                            size={22}

                                            className="text-violet-600"

                                        />

                                    </div>

                                    <div>

                                        <h3 className="font-semibold text-slate-800">

                                            {agent.name}

                                        </h3>

                                        <p className="text-sm text-slate-500">

                                            Autonomous Department

                                        </p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-4">

                                    <StatusBadge status={status} />

                                    <StatusIcon status={status} />

                                </div>

                            </div>

                        );

                    })

                }

            </div>

        </div>

    );

}

export default WorkflowTimeline;