import { useEffect, useRef } from "react";
import { Loader2, TerminalSquare } from "lucide-react";

import { getAgent, TINTS } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   CurrentAgentPanel — the live console.

   `logs` are built from real SSE events in Generation.jsx
   ([receivedAt] + the derived output label). The pane pins
   itself to the bottom as new lines arrive.
========================================================== */

function formatClock(seconds) {
    const safe = Math.max(0, seconds || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;

    return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function CurrentAgentPanel({ agentId, elapsed = 0, logs = [], running = true }) {
    const agent = getAgent(agentId);
    const Icon = agent?.icon || TerminalSquare;
    const palette = TINTS[agent?.tint] || TINTS.violet;

    const consoleRef = useRef(null);

    useEffect(() => {
        const node = consoleRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [logs.length]);

    return (
        <div className="panel p-6">
            <h2 className="text-base font-bold text-slate-100">Current Agent</h2>

            <div className="mt-4 flex items-start gap-4">
                <span
                    className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
                        palette.bg,
                        palette.ring,
                        running && agent && "live-dot"
                    )}
                >
                    <Icon size={21} className={palette.icon} />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-100">
                        {agent?.name || "No agent running"}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {agent?.blurb ||
                            "The graph is between steps — waiting for the next agent event."}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className={cn("chip", running && agent ? "chip-run" : "chip-idle")}>
                            {running && agent && <Loader2 size={11} className="animate-spin" />}
                            {running && agent ? "Executing…" : "Idle"}
                        </span>

                        <span className="chip chip-idle">
                            Elapsed {formatClock(elapsed)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ---------- Console ---------- */}
            <pre
                ref={consoleRef}
                className="mt-4 h-64 overflow-y-auto rounded-xl border border-[var(--color-line)] bg-black/55 p-4 font-mono text-[12.5px] leading-6 text-slate-400"
            >
                {logs.length === 0 ? (
                    <span className="text-slate-600">
                        $ waiting for the agent stream…
                    </span>
                ) : (
                    logs.map((line) => (
                        <div key={line.id}>
                            <span className="text-slate-600">[{line.time}]</span> {line.text}
                        </div>
                    ))
                )}
            </pre>
        </div>
    );
}

export default CurrentAgentPanel;
