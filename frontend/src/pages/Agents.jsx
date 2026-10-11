import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, CircleDot } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import Ring from "../components/ui/Ring";
import ActivityFeed from "../components/stream/ActivityFeed";
import { SAMPLE_ACTIVITY } from "../lib/activitySample";
import { AGENT_REGISTRY, fetchRealAgents, computeTotals, tintOf } from "../lib/agents";
import { cn } from "../lib/cn";
const STATUS_CHIP = { active: "chip-ok", idle: "chip-idle", offline: "chip-off" };
const STATUS_LABEL = { active: "Active", idle: "Idle", offline: "Offline" };
function Metric({ label, value }) {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm font-bold tabular-nums text-slate-100">{value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
        </div>
    );
}
function AgentCard({ agent }) {
    const Icon = agent.icon;
    return (
        <article className="panel panel-interactive flex flex-col p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${agent.accent}1f`, color: agent.accent, boxShadow: `inset 0 0 0 1px ${agent.accent}3d` }}>
                        <Icon size={22} />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-slate-100">{agent.name}</h2>
                        <p className="eyebrow mt-1">{agent.dept}</p>
                        <span className={cn("chip mt-2.5", STATUS_CHIP[agent.status])}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {STATUS_LABEL[agent.status]}
                        </span>
                    </div>
                </div>
                <Ring value={agent.progress} color={agent.accent} />
            </div>
            <p className="mt-5 flex-1 text-sm leading-relaxed text-slate-500">{agent.blurb}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-4">
                <Metric label="Tasks completed" value={agent.tasks} />
                <Metric label="Avg runtime" value={agent.avgRuntime} />
                <Metric label="Success rate" value={`${agent.successRate}%`} />
            </div>
            <div className="mt-5 flex gap-3">
                <Link to="/knowledge" className="btn-ghost flex-1 py-2.5 text-xs">View Logs</Link>
                <Link to="/generate" className="btn-solid flex-1 py-2.5 text-xs">Run</Link>
            </div>
        </article>
    );
}

function ExecutionOrder() {
    return (
        <section className="panel p-6">
            <h3 className="mb-4 text-sm font-bold text-slate-300">Execution order</h3>
            <div className="flex flex-wrap items-center gap-3">
                {AGENT_REGISTRY.map((agent, index) => {
                    const Icon = agent.icon;
                    const palette = tintOf(agent.id);
                    return (
                        <div key={agent.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-inset", palette.bg, palette.ring)}>
                            <Icon size={15} className={palette.icon} />
                            <span className="text-xs font-semibold text-slate-300">{agent.id}</span>
                        </div>
                    );
                })}
                {AGENT_REGISTRY.map((_, index) => {
                    if (index < AGENT_REGISTRY.length - 1) {
                        return <ArrowRight key={"arrow-" + index} size={14} className="text-slate-700" />;
                    }
                    return null;
                })}
            </div>
        </section>
    );
}

function Agents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const realAgents = await fetchRealAgents();
                if (mounted) setAgents(realAgents);
            } catch { /* keep dummy */ }
            finally { if (mounted) setLoading(false); }
        }
        load();
        const interval = setInterval(load, 10_000);
        return () => { mounted = false; clearInterval(interval); };
    }, []);
    const totals = computeTotals(agents);
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="section-label mb-1.5">Workforce</p>
                    <h2 className="text-xl font-bold tracking-tight text-slate-50 sm:text-[22px]">{totals.total} specialised departments</h2>
                </div>
                <Link to="/generate" className="btn-solid shrink-0">Run the team<ArrowRight size={15} /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Agents" value={totals.total} icon={Users} tone="violet" hint="Departments in the graph" loading={loading} />
                <StatCard title="Active Agents" value={totals.active} icon={CircleDot} tone="emerald" hint="Working on a run" loading={loading} />
                <StatCard title="Idle Agents" value={totals.idle} icon={CircleDot} tone="sky" hint="Ready, no current task" loading={loading} />
                <StatCard title="Offline Agents" value={totals.offline} icon={CircleDot} tone="red" hint="Not responding" loading={loading} />
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                    {loading ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="panel p-6">
                            <div className="skeleton h-4 w-32 rounded-lg" />
                            <div className="skeleton mt-3 h-3 w-20 rounded" />
                            <div className="skeleton mt-6 h-16 w-full rounded-xl" />
                            <div className="skeleton mt-5 h-10 w-full rounded-xl" />
                        </div>
                    )) : agents.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>
                <ActivityFeed events={SAMPLE_ACTIVITY} title="Recent Activity" subtitle="Across every department" footerTo="/analytics" className="xl:sticky xl:top-6 xl:self-start" />
            </div>
            <ExecutionOrder />
        </div>
    );
}

export default Agents;
