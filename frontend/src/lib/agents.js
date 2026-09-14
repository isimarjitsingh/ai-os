import {
    Brain,
    Search,
    Megaphone,
    DollarSign,
    Code2,
    FolderGit2,
} from "lucide-react";

/* ==========================================================
   AGENT REGISTRY

   Mirrors the real graph in Backend/graphs/company_graph.py:
   ceo -> research -> marketing -> finance -> coding
   -> file_generator -> ceo_finalize

   Every agent emits SSE events as:
   { agent, status, output }
========================================================== */

export const AGENTS = [
    {
        id: "ceo",
        name: "CEO Agent",
        dept: "Executive",
        icon: Brain,
        tint: "violet",
        accent: "#7c5cff",
        status: "active",
        progress: 92,
        tasks: 128,
        avgRuntime: "1m 12s",
        successRate: 99,
        blurb:
            "Reads your idea, decides which departments are needed, and writes the final executive verdict.",
        output: "Execution plan · Executive summary",
    },
    {
        id: "research",
        name: "Research Agent",
        dept: "Market Intel",
        icon: Search,
        tint: "cyan",
        accent: "#22d3ee",
        status: "active",
        progress: 76,
        tasks: 112,
        avgRuntime: "2m 04s",
        successRate: 97,
        blurb:
            "Analyses the market, audience, competitors, feature set, opportunities and risks.",
        output: "Research report",
    },
    {
        id: "marketing",
        name: "Marketing Agent",
        dept: "Growth",
        icon: Megaphone,
        tint: "pink",
        accent: "#f472b6",
        status: "idle",
        progress: 48,
        tasks: 64,
        avgRuntime: "1m 38s",
        successRate: 95,
        blurb:
            "Builds positioning, launch strategy, channel plan, content ideas and growth KPIs.",
        output: "Marketing report",
    },
    {
        id: "finance",
        name: "Finance Agent",
        dept: "Finance",
        icon: DollarSign,
        tint: "emerald",
        accent: "#34d399",
        status: "idle",
        progress: 35,
        tasks: 51,
        avgRuntime: "1m 21s",
        successRate: 96,
        blurb:
            "Models startup and monthly costs, revenue streams, pricing and break-even.",
        output: "Finance model",
    },
    {
        id: "coding",
        name: "Coding Agent",
        dept: "Engineering",
        icon: Code2,
        tint: "sky",
        accent: "#38bdf8",
        status: "active",
        progress: 81,
        tasks: 97,
        avgRuntime: "3m 47s",
        successRate: 93,
        blurb:
            "Designs the architecture, tech stack, database schema and API endpoint contract.",
        output: "Technical blueprint",
    },
    {
        id: "file_generator",
        name: "File Generator",
        dept: "Engineering",
        icon: FolderGit2,
        tint: "amber",
        accent: "#fbbf24",
        status: "offline",
        progress: 12,
        tasks: 43,
        avgRuntime: "4m 26s",
        successRate: 91,
        blurb:
            "Writes the actual project files to disk so they can be browsed and previewed live.",
        output: "Generated project files",
    },
];

/* ==========================================================
    Derived roster totals — computed from AGENTS so the stat
    row can never drift from the cards below it.
========================================================== */

export const AGENT_TOTALS = AGENTS.reduce(
    (acc, agent) => {
        acc.total += 1;
        if (agent.status === "active") acc.active += 1;
        if (agent.status === "idle") acc.idle += 1;
        if (agent.status === "offline") acc.offline += 1;
        return acc;
    },
    { total: 0, active: 0, idle: 0, offline: 0 }
);


export const AGENT_BY_ID = Object.fromEntries(
    AGENTS.map((agent) => [agent.id, agent])
);

export const AGENT_IDS = AGENTS.map((agent) => agent.id);

export function getAgent(id) {
    return AGENT_BY_ID[id] || null;
}

/* ==========================================================
   TINT MAP
   Tailwind class strings are written in full so the
   v4 scanner can see them (never build class names at runtime).
========================================================== */

export const TINTS = {
    violet: {
        icon: "text-violet-300",
        bg: "bg-violet-500/10",
        ring: "ring-violet-400/30",
        bar: "from-violet-500 to-indigo-500",
    },
    cyan: {
        icon: "text-cyan-300",
        bg: "bg-cyan-500/10",
        ring: "ring-cyan-400/30",
        bar: "from-cyan-400 to-sky-500",
    },
    pink: {
        icon: "text-pink-300",
        bg: "bg-pink-500/10",
        ring: "ring-pink-400/30",
        bar: "from-pink-500 to-rose-500",
    },
    emerald: {
        icon: "text-emerald-300",
        bg: "bg-emerald-500/10",
        ring: "ring-emerald-400/30",
        bar: "from-emerald-400 to-teal-500",
    },
    sky: {
        icon: "text-sky-300",
        bg: "bg-sky-500/10",
        ring: "ring-sky-400/30",
        bar: "from-sky-400 to-indigo-500",
    },
    amber: {
        icon: "text-amber-300",
        bg: "bg-amber-500/10",
        ring: "ring-amber-400/30",
        bar: "from-amber-400 to-orange-500",
    },
};

export function tintOf(agentId) {
    const agent = getAgent(agentId);
    return TINTS[agent?.tint] || TINTS.violet;
}
