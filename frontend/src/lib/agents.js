import { Brain, Search, Megaphone, DollarSign, Code2, FolderGit2 } from "lucide-react";
import { getAgentsStatus } from "../services/api";

export const AGENT_REGISTRY = [
    {
        id: "ceo",
        name: "CEO Agent",
        dept: "Executive",
        icon: Brain,
        tint: "violet",
        accent: "#7c5cff",
        blurb: "Reads your idea, decides which departments are needed, and writes the final executive verdict.",
        output: "Execution plan · Executive summary",
    },
    {
        id: "research",
        name: "Research Agent",
        dept: "Market Intel",
        icon: Search,
        tint: "cyan",
        accent: "#22d3ee",
        blurb: "Analyses the market, audience, competitors, feature set, opportunities and risks.",
        output: "Research report",
    },
    {
        id: "marketing",
        name: "Marketing Agent",
        dept: "Growth",
        icon: Megaphone,
        tint: "pink",
        accent: "#f472b6",
        blurb: "Builds positioning, launch strategy, channel plan, content ideas and growth KPIs.",
        output: "Marketing report",
    },
    {
        id: "finance",
        name: "Finance Agent",
        dept: "Finance",
        icon: DollarSign,
        tint: "emerald",
        accent: "#34d399",
        blurb: "Models startup and monthly costs, revenue streams, pricing and break-even.",
        output: "Finance model",
    },
    {
        id: "coding",
        name: "Coding Agent",
        dept: "Engineering",
        icon: Code2,
        tint: "sky",
        accent: "#38bdf8",
        blurb: "Designs the architecture, tech stack, database schema and API endpoint contract.",
        output: "Technical blueprint",
    },
    {
        id: "file_generator",
        name: "File Generator",
        dept: "Engineering",
        icon: FolderGit2,
        tint: "amber",
        accent: "#fbbf24",
        blurb: "Writes the actual project files to disk so they can be browsed and previewed live.",
        output: "Generated project files",
    },
];

const REGISTRY_BY_ID = Object.fromEntries(AGENT_REGISTRY.map((a) => [a.id, a]));

const DUMMY_AGENTS = AGENT_REGISTRY.map((base) => ({
    ...base,
    status: "offline",
    progress: 0,
    tasks: 0,
    avgRuntime: "0m 00s",
    successRate: 0,
}));

export async function fetchRealAgents() {
    try {
        const data = await getAgentsStatus();
        if (!data?.agents) return DUMMY_AGENTS;
        return data.agents.map((backend) => {
            const base = REGISTRY_BY_ID[backend.agent];
            if (!base) return null;
            const seconds = backend.avg_runtime_seconds || 0;
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return {
                ...base,
                status: backend.status === "active" ? "active" : backend.status === "idle" ? "idle" : "offline",
                progress: backend.progress ?? 0,
                tasks: backend.tasks_completed ?? 0,
                avgRuntime: `${mins}m ${String(secs).padStart(2, "0")}s`,
                successRate: backend.success_rate ?? 0,
            };
        }).filter(Boolean);
    } catch {
        return DUMMY_AGENTS;
    }
}

export function computeTotals(agents) {
    return agents.reduce((acc, agent) => {
        acc.total += 1;
        if (agent.status === "active") acc.active += 1;
        if (agent.status === "idle") acc.idle += 1;
        if (agent.status === "offline") acc.offline += 1;
        return acc;
    }, { total: 0, active: 0, idle: 0, offline: 0 });
}

export function tintOf(agentId) {
    const agent = REGISTRY_BY_ID[agentId] || null;
    const TINTS = {
        violet: { icon: "text-violet-300", bg: "bg-violet-500/10", ring: "ring-violet-400/30", bar: "from-violet-500 to-indigo-500" },
        cyan: { icon: "text-cyan-300", bg: "bg-cyan-500/10", ring: "ring-cyan-400/30", bar: "from-cyan-400 to-sky-500" },
        pink: { icon: "text-pink-300", bg: "bg-pink-500/10", ring: "ring-pink-400/30", bar: "from-pink-500 to-rose-500" },
        emerald: { icon: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-400/30", bar: "from-emerald-400 to-teal-500" },
        sky: { icon: "text-sky-300", bg: "bg-sky-500/10", ring: "ring-sky-400/30", bar: "from-sky-400 to-indigo-500" },
        amber: { icon: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-400/30", bar: "from-amber-400 to-orange-500" },
    };
    return TINTS[agent?.tint] || TINTS.violet;
}
