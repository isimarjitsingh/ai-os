import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import { AGENTS, TINTS } from "../lib/agents";
import { cn } from "../lib/cn";

/* ==========================================================
   Agents — the real department roster.

   Mirrors Backend/agents/*.py and the graph order in
   Backend/graphs/company_graph.py. Static by nature: these
   are the agents the backend actually ships.
========================================================== */

function Agents() {
    return (
        <div className="space-y-7">
            <PageHeader
                eyebrow="Workforce"
                title="Agents"
                description="Six specialised departments run in a fixed sequence. The CEO plans first, then each department executes and hands off."
                actions={
                    <Link to="/generate" className="btn-primary text-sm">
                        Run the team
                        <ArrowRight size={15} />
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {AGENTS.map((agent, index) => {
                    const Icon = agent.icon;
                    const palette = TINTS[agent.tint] || TINTS.violet;

                    return (
                        <article
                            key={agent.id}
                            className="panel panel-interactive flex flex-col p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <span
                                    className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset",
                                        palette.bg,
                                        palette.ring
                                    )}
                                >
                                    <Icon size={22} className={palette.icon} />
                                </span>

                                <span className="text-3xl font-black text-white/5">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                            </div>

                            <h2 className="mt-5 text-lg font-bold text-slate-100">
                                {agent.name}
                            </h2>

                            <p className="eyebrow mt-1">{agent.dept}</p>

                            <p className="mt-3.5 flex-1 text-sm leading-relaxed text-slate-500">
                                {agent.blurb}
                            </p>

                            <div className="mt-5 flex items-center justify-between border-t border-slate-400/10 pt-4">
                                <span className="text-xs text-slate-600">Emits</span>

                                <span
                                    className={cn(
                                        "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                                        palette.bg,
                                        palette.ring,
                                        palette.icon
                                    )}
                                >
                                    {agent.output}
                                </span>
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* ---------- Execution order ---------- */}
            <section className="panel p-6">
                <h2 className="text-base font-bold text-slate-100">
                    Execution Order
                </h2>

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
        </div>
    );
}

export default Agents;
