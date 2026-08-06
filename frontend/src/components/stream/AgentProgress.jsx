import ProgressCard from "./ProgressCard";
import CurrentAgent from "./CurrentAgent";
import WorkflowTimeline from "./WorkflowTimeline";

function AgentProgress({

    completed = 0,

    total = 6,

    currentAgent = null,

    finished = false,

    statuses = {}

}) {

    return (

        <div className="space-y-6">

            {/* Progress */}

            <ProgressCard

                completed={completed}

                total={total}

            />

            {/* Current Running Agent */}

            <CurrentAgent

                agent={currentAgent}
                finished={finished}

            />

            {/* Workflow */}

            <WorkflowTimeline

                statuses={statuses}

            />

        </div>

    );

}

export default AgentProgress;