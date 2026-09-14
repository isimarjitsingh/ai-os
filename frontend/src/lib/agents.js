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
        blurb:
            "Writes the actual project files to disk so they can be browsed and previewed live.",
        output: "Generated project files",
    },
];

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
