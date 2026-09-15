import { useMemo } from "react";
import { BarChart3, CheckCircle2, Rocket, Activity, Timer, XCircle } from "lucide-react";

import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

import { useProjects } from "../hooks/useProjects";
import { countByStatus, formatDate } from "../lib/format";

/* ==========================================================
   Analytics - aggregated from GET /projects. There is no
   metrics endpoint, so every figure is the real history of
   the signed-in account.

   The masthead carries the page identity, so this screen goes
   straight into the KPI row exactly like the reference.
========================================================== */

const DAYS = 7;

function dayKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildSeries(projects) {
    const buckets = [];

    for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - offset);

        buckets.push({
            key: dayKey(date),
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            count: 0,
        });
    }

    const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));

    projects.forEach((project) => {
        if (!project.created_at) return;

        const at = index.get(dayKey(new Date(project.created_at)));
        if (at !== undefined) buckets[at].count += 1;
    });

    return buckets;
}

function Analytics() {
    const { projects, loading, error, reload } = useProjects();

    const counts = useMemo(() => countByStatus(projects), [projects]);
    const series = useMemo(() => buildSeries(projects), [projects]);
    const peak = Math.max(1, ...series.map((bucket) => bucket.count));
    const weekTotal = series.reduce((sum, bucket) => sum + bucket.count, 0);

    const completed = counts.completed || 0;
    const running = counts.running || 0;
    const successRate = projects.length
        ? Math.round((completed / projects.length) * 100)
        : 0;

    if (error) {
        return (
            <EmptyState
                icon={XCircle}
                title="Could not load analytics"
                description={error}
                action={
                    <button onClick={reload} className="btn-ghost text-xs">
                        Try again
                    </button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* ---------------- KPI row ---------------- */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Workflow completion" value={`${successRate}%`} icon={Activity} tone="violet" hint="Completed of all runs" loading={loading} />
                <StatCard title="Agent runs" value={projects.length} icon={Rocket} tone="sky" hint="Workspaces started" loading={loading} />
                <StatCard title="Completed tasks" value={completed} icon={CheckCircle2} tone="emerald" hint="Ready to open" loading={loading} />
                <StatCard title="In progress" value={running} icon={Timer} tone="amber" hint="Running right now" loading={loading} />
            </div>

            {/* ---------------- Activity chart ---------------- */}
            <Panel
                title="Agent activity"
                subtitle={`Workspaces started across the last ${DAYS} days.`}
                icon={BarChart3}
                action={
                    <span className={weekTotal ? "chip chip-ok" : "chip chip-idle"}>
                        {weekTotal ? "Active week" : "Quiet week"}
                    </span>
                }
            >
                {loading ? (
                    <Skeleton className="h-56 w-full" />
                ) : projects.length === 0 ? (
                    <p className="py-20 text-center text-sm text-slate-500">
                        No runs recorded yet. Generate a workspace to start collecting data.
                    </p>
                ) : (
                    <div className="flex h-56 items-end gap-3 sm:gap-5">
                        {series.map((bucket) => (
                            <div
                                key={bucket.key}
                                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3 self-stretch"
                            >
                                <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                                    {bucket.count || ""}
                                </span>

                                <div
                                    title={`${bucket.count} on ${formatDate(bucket.key)}`}
                                    className={
                                        bucket.count
                                            ? "w-full max-w-[56px] rounded-xl bg-gradient-to-t from-violet-600 to-violet-400"
                                            : "w-full max-w-[56px] rounded-xl bg-white/[0.04]"
                                    }
                                    style={{
                                        height: bucket.count
                                            ? `${Math.max(10, (bucket.count / peak) * 100)}%`
                                            : "6px",
                                    }}
                                />

                                <span className="text-xs text-slate-500">{bucket.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

export default Analytics;

