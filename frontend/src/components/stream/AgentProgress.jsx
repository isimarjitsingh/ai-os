import ProgressCard from "./ProgressCard";
import WorkflowTimeline from "./WorkflowTimeline";

/* ==========================================================
   AgentProgress — composes the live workflow widgets.
========================================================== */

function AgentProgress({
    completed = 0,
    total = 6,
    percentage = 0,
    currentAgent = null,
    finished = false,
    failed = false,
    connected = false,
    elapsed = 0,
    statuses = {},
}) {
    return (
        <div className="space-y-6">
            <ProgressCard
                completed={completed}
                total={total}
                percentage={percentage}
                currentAgent={currentAgent}
                finished={finished}
                failed={failed}
                connected={connected}
                elapsed={elapsed}
            />

            <WorkflowTimeline statuses={statuses} />
        </div>
    );
}

export default AgentProgress;
