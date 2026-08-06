function ProgressCard({

    completed = 0,

    total = 6

}) {

    const percentage = Math.round((completed / total) * 100);

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            {/* Header */}

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="text-xl font-bold text-slate-900">

                        Overall Progress

                    </h2>

                    <p className="mt-1 text-sm text-slate-500">

                        AI Company Workflow

                    </p>

                </div>

                <div className="text-3xl font-bold text-violet-600">

                    {percentage}%

                </div>

            </div>

            {/* Progress Bar */}

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">

                <div

                    className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 transition-all duration-700"

                    style={{
                        width: `${percentage}%`
                    }}

                />

            </div>

            {/* Footer */}

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">

                <span>

                    {completed} of {total} agents completed

                </span>

                <span>

                    {total - completed} remaining

                </span>

            </div>

        </div>

    );

}

export default ProgressCard;