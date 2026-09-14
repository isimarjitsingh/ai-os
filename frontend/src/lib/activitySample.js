/* ==========================================================
   Representative roster feed for the Agents page, which has
   no live thread of its own. Shaped exactly like the SSE
   events useGeneration produces: { agent, status, label,
   receivedAt } — so it renders through the real ActivityFeed.
========================================================== */

function minutesAgo(minutes) {
    return new Date(Date.now() - minutes * 60_000);
}

export const SAMPLE_ACTIVITY = [
    {
        agent: "ceo",
        status: "completed",
        label: "Approved the execution plan and routed work to 5 departments.",
        receivedAt: minutesAgo(2),
    },
    {
        agent: "coding",
        status: "running",
        label: "Scaffolding the API contract and Postgres schema.",
        receivedAt: minutesAgo(1),
    },
    {
        agent: "research",
        status: "completed",
        label: "Found 4 direct competitors and 3 underserved segments.",
        receivedAt: minutesAgo(6),
    },
    {
        agent: "marketing",
        status: "waiting",
        label: "Waiting on research output before drafting positioning.",
        receivedAt: minutesAgo(9),
    },
    {
        agent: "file_generator",
        status: "failed",
        label: "Sandbox timed out before writing the final 2 files.",
        receivedAt: minutesAgo(21),
    },
];

export default SAMPLE_ACTIVITY;
