import { useEffect, useMemo, useRef, useState } from "react";

import { getWorkflowStream } from "../services/api";
import { AGENT_IDS } from "../lib/agents";

/* ==========================================================
   useGeneration — subscribes to GET /stream/{thread_id}

   The backend (services/workflow_bus.py) emits exactly:
       { agent, status, output }
   as an SSE event named "update", followed by a terminal
   "completed" or "failed" event.

   `output` is whatever the agent returned — a string or a
   nested object — so we derive a short human label from it.
========================================================== */

const INITIAL_STATUS = Object.fromEntries(
    AGENT_IDS.map((id) => [id, "waiting"])
);

function summariseOutput(output) {
    if (output === null || output === undefined || output === "") {
        return "Finished without output";
    }

    if (typeof output === "string") {
        return output.replace(/\s+/g, " ").trim().slice(0, 180);
    }

    if (typeof output === "object") {
        /* Prefer the most descriptive common keys */
        const preferred = [
            "summary",
            "message",
            "executive_summary",
            "market_overview",
            "marketing_summary",
            "project_name",
            "architecture",
            "output",
            "result",
        ];

        for (const key of preferred) {
            const value = output[key];
            if (typeof value === "string" && value.trim()) {
                return value.replace(/\s+/g, " ").trim().slice(0, 180);
            }
        }

        const keys = Object.keys(output);
        return `Produced ${keys.length} field${keys.length === 1 ? "" : "s"}`;
    }

    return String(output);
}

export function useGeneration(threadId, userGoal) {
    const [events, setEvents] = useState([]);
    const [statuses, setStatuses] = useState(INITIAL_STATUS);
    const [finished, setFinished] = useState(false);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState(null);
    const [connected, setConnected] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    /* Set inside the timer effect — calling Date.now() during render
       would make the hook impure. */
    const startedAt = useRef(0);

    /* ---------------- SSE subscription ---------------- */

    useEffect(() => {
        if (!threadId) return undefined;

        const source = new EventSource(getWorkflowStream(threadId, userGoal));

        const push = (data) => {
            setEvents((prev) => [
                ...prev,
                {
                    ...data,
                    receivedAt: new Date(),
                    label: summariseOutput(data?.output),
                },
            ]);
        };

        source.addEventListener("open", () => setConnected(true));

        source.addEventListener("update", (event) => {
            let data;

            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            push(data);

            if (data?.agent && data?.status) {
                setStatuses((prev) => ({
                    ...prev,
                    [data.agent]: data.status,
                }));
            }
        });

        source.addEventListener("completed", () => {
            /* Terminal event — the payload only repeats thread_id. */
            setFinished(true);
            setFailed(false);
            setConnected(false);
            source.close();
        });

        source.addEventListener("failed", (event) => {
            let message = "Workflow failed";

            try {
                const data = JSON.parse(event.data);
                message = data.error || data.output || message;
            } catch {
                /* keep default */
            }

            setFailed(true);
            setFinished(false);
            setConnected(false);
            setError(message);
            source.close();
        });

        source.onerror = () => {
            /*
             * The server closes the stream after a terminal event,
             * which surfaces here too. Only treat it as a real
             * failure if we never received a terminal event.
             */
            setConnected(false);
            source.close();
        };

        return () => {
            source.close();
        };
    }, [threadId, userGoal]);

    /* ---------------- elapsed timer ---------------- */

    useEffect(() => {
        if (finished || failed) return undefined;

        startedAt.current = Date.now();

        const id = setInterval(() => {
            setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
        }, 1000);

        return () => clearInterval(id);
    }, [finished, failed]);

    /* ---------------- derived ---------------- */

    const completed = useMemo(
        () =>
            AGENT_IDS.filter((id) => statuses[id] === "completed").length,
        [statuses]
    );

    const currentAgent = useMemo(
        () => AGENT_IDS.find((id) => statuses[id] === "running") || null,
        [statuses]
    );

    const total = AGENT_IDS.length;

    const percentage = failed
        ? Math.round((completed / total) * 100)
        : finished
        ? 100
        : Math.round((completed / total) * 100);

    return {
        events,
        statuses,
        completed,
        total,
        percentage,
        currentAgent,
        finished,
        failed,
        error,
        connected,
        elapsed,
    };
}

export default useGeneration;
