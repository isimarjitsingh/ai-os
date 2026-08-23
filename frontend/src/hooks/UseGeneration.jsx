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

    const [failed, setFailed] = useState(false);

    const [error, setError] = useState(null);


    useEffect(() => {

        if (!threadId) return;

        const eventSource = new EventSource(
            getWorkflowStream(
                threadId,
                userGoal
            )
        );


        // =====================================================
        // WORKFLOW / AGENT UPDATE
        // =====================================================

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


        // =====================================================
        // WORKFLOW COMPLETED
        // =====================================================

        eventSource.addEventListener("completed", (event) => {

            console.log("✅ WORKFLOW COMPLETED");

            setFinished(true);

            setFailed(false);

            eventSource.close();

        });


        // =====================================================
        // WORKFLOW FAILED
        // =====================================================

        eventSource.addEventListener("failed", (event) => {

            console.error("❌ WORKFLOW FAILED");

            try {

                const data = JSON.parse(event.data);

                console.error(
                    "Workflow failure:",
                    data
                );


                setFailed(true);

                setFinished(false);

                setError(
                    data.error ||
                    data.output ||
                    "Workflow failed"
                );


                // Mark workflow as failed
                setStatuses(prev => ({

                    ...prev,

                    workflow: "failed"

                }));


            }

            catch (error) {

                console.error(
                    "Failed to process workflow failure:",
                    error
                );

                setFailed(true);

                setFinished(false);

                setError(
                    "Workflow failed"
                );

            }

            finally {

                // VERY IMPORTANT
                // Stop listening to the SSE stream

                eventSource.close();

            }

        });


        // =====================================================
        // SSE CONNECTION ERROR
        // =====================================================

        eventSource.onerror = (error) => {

            console.error(
                "SSE connection error:",
                error
            );

            eventSource.close();

        };


        // =====================================================
        // CLEANUP
        // =====================================================

        return () => {

            eventSource.close();

        };

    }, [

        threadId,

        userGoal

    ]);


    const completed = Object.values(statuses)

        .filter(
            status => status === "completed"
        )
        .length;


    const total = Object.keys(statuses).length;


    const currentAgent = Object.keys(statuses)

        .find(
            agent => statuses[agent] === "running"
        );


    return {

        events,

        statuses,

        completed,

        total,

        currentAgent,

        finished,

        failed,

        error

    };

}