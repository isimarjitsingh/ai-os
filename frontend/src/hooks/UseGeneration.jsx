import { useEffect, useState } from "react";
import { getWorkflowStream } from "../services/api";

const INITIAL_STATUS = {
    research: "waiting",
    marketing: "waiting",
    finance: "waiting",
    coding: "waiting",
    file_generator: "waiting",
    ceo: "waiting"
};

export default function useGeneration(threadId, userGoal) {

    const [events, setEvents] = useState([]);

    const [statuses, setStatuses] = useState(INITIAL_STATUS);

    const [finished, setFinished] = useState(false);

    useEffect(() => {

        if (!threadId) return;

        const eventSource = new EventSource(
            getWorkflowStream(
                threadId,
                userGoal
            )
        );

        eventSource.addEventListener("update", (event) => {

            const data = JSON.parse(event.data);

            console.log("UPDATE:", data);

            setEvents(prev => [...prev, data]);

            if (data.agent) {

                setStatuses(prev => ({

                    ...prev,

                    [data.agent]: data.status

                }));

            }

        });

        eventSource.addEventListener("completed", () => {

            setFinished(true);

            eventSource.close();

        });

        eventSource.onerror = (error) => {

            console.error(error);

            eventSource.close();

        };

        return () => {

            eventSource.close();

        };

    }, [

        threadId,

        userGoal

    ]);

    const completed = Object.values(statuses)

        .filter(status => status === "completed")

        .length;

    const total = Object.keys(statuses).length;

    const currentAgent = Object.keys(statuses)

        .find(agent => statuses[agent] === "running");

    return {

        events,

        statuses,

        completed,

        total,

        currentAgent,

        finished

    };

}