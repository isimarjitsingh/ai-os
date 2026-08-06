import {
    CheckCircle2,
    Loader2,
    Clock3,
    Brain,
    Search,
    Megaphone,
    DollarSign,
    Code2,
    FolderGit2
} from "lucide-react";

const ICONS = {
    ceo: Brain,
    research: Search,
    marketing: Megaphone,
    finance: DollarSign,
    coding: Code2,
    files: FolderGit2
};

function StatusIcon({ status }) {

    if (status === "completed") {

        return (
            <CheckCircle2
                size={18}
                className="text-green-600"
            />
        );

    }

    if (status === "running") {

        return (
            <Loader2
                size={18}
                className="animate-spin text-violet-600"
            />
        );

    }

    return (
        <Clock3
            size={18}
            className="text-slate-400"
        />
    );

}

function ActivityFeed({

    events = []

}) {

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            {/* Header */}

            <div className="mb-6">

                <h2 className="text-xl font-bold text-slate-900">

                    Activity Feed

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                    Live workflow execution logs

                </p>

            </div>

            {/* Empty State */}

            {

                events.length === 0 && (

                    <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200">

                        <div className="text-center">

                            <Loader2

                                size={28}

                                className="mx-auto animate-spin text-violet-500"

                            />

                            <p className="mt-4 text-slate-500">

                                Waiting for workflow to start...

                            </p>

                        </div>

                    </div>

                )

            }

            {/* Timeline */}

            <div className="space-y-5">

                {

                    events.map((event, index) => {

                        const Icon = ICONS[event.agent] || Brain;

                        return (

                            <div
                                key={index}
                                className="flex gap-4"
                            >

                                {/* Left */}

                                <div className="flex flex-col items-center">

                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">

                                        <Icon
                                            size={20}
                                            className="text-violet-600"
                                        />

                                    </div>

                                    {

                                        index !== events.length - 1 && (

                                            <div className="mt-2 h-10 w-px bg-slate-200"></div>

                                        )

                                    }

                                </div>

                                {/* Right */}

                                <div className="flex-1 rounded-2xl border border-slate-200 p-4">

                                    <div className="flex items-center justify-between">

                                        <h3 className="font-semibold text-slate-900">

                                            {event.agent}

                                        </h3>

                                        <StatusIcon
                                            status={event.status}
                                        />

                                    </div>

                                    <p className="mt-2 text-sm text-slate-600">

                                        {event.message}

                                    </p>

                                    <div className="mt-3 flex items-center justify-between">

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">

                                            {event.status}

                                        </span>

                                        <span className="text-xs text-slate-400">

                                            {event.time}

                                        </span>

                                    </div>

                                </div>

                            </div>

                        );

                    })

                }

            </div>

        </div>

    );

}

export default ActivityFeed;