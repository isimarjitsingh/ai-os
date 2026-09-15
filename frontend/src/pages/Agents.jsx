import { Link } from "react-router-dom";
import { ArrowRight, Users, CircleDot } from "lucide-react";

import StatCard from "../components/ui/StatCard";
import Ring from "../components/ui/Ring";
import ActivityFeed from "../components/stream/ActivityFeed";
import { SAMPLE_ACTIVITY } from "../lib/activitySample";

import { AGENTS, AGENT_TOTALS, TINTS } from "../lib/agents";
import { cn } from "../lib/cn";

/* ==========================================================
   Agents — the department roster.

   Mirrors Backend/agents/*.py and the graph order in
   Backend/graphs/company_graph.py. The operational numbers on
   each card (progress / tasks / runtime / success rate) are
   representative roster values held in lib/agents.js — the
   backend exposes no per-agent metrics endpoint.
========================================================== */

const STATUS_CHIP = {
    active: "chip-ok",
    idle: "chip-idle",
    offline: "chip-off",
};

const STATUS_LABEL = {
    active: "Active",
    idle: "Idle",
    offline: "Offline",
};

function Metric({ label, value }) {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm font-bold tabular-nums text-slate-100">{value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">
                {label}
            </p>
        </div>
    );
}

function AgentCard({ agent }) {
    const Icon = agent.icon;

    return (
        <article className="panel panel-interactive flex flex-col p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{
                            background: `${agent.accent}1f`,
                            color: agent.accent,
                            boxShadow: `inset 0 0 0 1px ${agent.accent}3d`,
                        }}
                    >
                        <Icon size={22} />
                    </span>

                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-slate-100">
                            {agent.name}
                        </h2>

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
                <Link to="/knowledge" className="btn-ghost flex-1 py-2.5 text-xs">
                    View Logs
                </Link>

                <Link to="/settings" className="btn-ghost flex-1 py-2.5 text-xs">
                    Configure
                </Link>
            </div>
        </article>
    );
}

function ExecutionOrder() {
    return (
        <section className="panel p-6">
            <h2 className="text-base font-bold text-slate-100">Execution Order</h2>

            <p className="mt-1 text-sm text-slate-500">
                Streamed live over SSE at{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-violet-300">
                    GET /stream/{"{thread_id}"}
                </code>
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                {AGENTS.map((agent, index) => {
                    const Icon = agent.icon;
                    const palette = TINTS[agent.tint] || TINTS.violet;

                    return (
                        <div key={agent.id} className="flex items-center gap-3">
                            <div
                                className={cn(
                                    "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 ring-1 ring-inset",
                                    palette.bg,
                                    palette.ring
                                )}
                            >
                                <Icon size={15} className={palette.icon} />

                                <span className="text-xs font-semibold text-slate-300">
                                    {agent.id}
                                </span>
                            </div>

                            {index < AGENTS.length - 1 && (
                                <ArrowRight size={14} className="text-slate-700" />
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function Agents() {
    return (
        <div className="space-y-6">
            {/* ---------- Section bar (the page title lives in the masthead) ---------- */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="section-label mb-1.5">Workforce</p>

                    <h2 className="text-xl font-bold tracking-tight text-slate-50 sm:text-[22px]">
                        {AGENT_TOTALS.total} specialised departments
                    </h2>
                </div>

                <Link to="/generate" className="btn-solid shrink-0">
                    Run the team
                    <ArrowRight size={15} />
                </Link>
            </div>

            {/* ---------------- Stat row ---------------- */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Agents"
                    value={AGENT_TOTALS.total}
                    icon={Users}
                    tone="violet"
                    hint="Departments in the graph"
                />
                <StatCard
                    title="Active Agents"
                    value={AGENT_TOTALS.active}
                    icon={CircleDot}
                    tone="emerald"
                    hint="Working on a run"
                />
                <StatCard
                    title="Idle Agents"
                    value={AGENT_TOTALS.idle}
                    icon={CircleDot}
                    tone="sky"
                    hint="Ready, no current task"
                />
                <StatCard
                    title="Offline Agents"
                    value={AGENT_TOTALS.offline}
                    icon={CircleDot}
                    tone="red"
                    hint="Not responding"
                />
            </div>

            {/* ---------------- Roster + live rail ---------------- */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                    {AGENTS.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>

                <ActivityFeed
                    events={SAMPLE_ACTIVITY}
                    title="Recent Activity"
                    subtitle="Across every department"
                    footerTo="/analytics"
                    className="xl:sticky xl:top-6 xl:self-start"
                />
            </div>

            <ExecutionOrder />
        </div>
    );
}

export default Agents;

