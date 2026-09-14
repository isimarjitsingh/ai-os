import { useState } from "react";
import {
    UserRound,
    KeyRound,
    Server,
    RefreshCw,
    LogOut,
    ShieldCheck,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../services/config";
import { formatDate, initials } from "../lib/format";

/* ==========================================================
   Settings — account + session.

   The backend exposes GET /auth/me and POST /auth/logout
   only. There is no profile-update endpoint, so the fields
   below are intentionally read-only rather than fake inputs.
========================================================== */

function Row({ label, value, mono = false }) {
    return (
        <div className="flex flex-col gap-1 border-b border-slate-400/8 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </span>

            <span
                className={
                    mono
                        ? "truncate rounded-lg bg-black/40 px-2 py-1 font-mono text-xs text-slate-300 sm:max-w-md"
                        : "truncate text-sm font-medium text-slate-200 sm:max-w-md"
                }
            >
                {value || "—"}
            </span>
        </div>
    );
}

function Settings() {
    const { user, logout, refreshUser, token } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    async function handleRefresh() {
        setRefreshing(true);
        await refreshUser();
        setRefreshing(false);
    }

    return (
        <div className="space-y-7">
            <PageHeader
                eyebrow="Account"
                title="Settings"
                description="Your identity, session and the API endpoint this console is wired to."
            />

            {/* ---------- Identity ---------- */}
            <Panel title="Profile" subtitle="Served by GET /auth/me" icon={UserRound} padded={false}>
                <div className="flex items-center gap-5 border-b border-slate-400/8 p-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white">
                        {initials(user?.name)}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-slate-100">
                            {user?.name || "Unknown user"}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                            {user?.email || "No email on file"}
                        </p>
                    </div>
                </div>

                <div className="px-6 py-2">
                    <Row label="User ID" value={user?.id} mono />
                    <Row label="Member since" value={formatDate(user?.created_at)} />
                </div>

                <div className="border-t border-slate-400/8 p-5">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="btn-ghost text-xs disabled:opacity-60"
                    >
                        <RefreshCw
                            size={14}
                            className={refreshing ? "animate-spin" : ""}
                        />
                        {refreshing ? "Refreshing…" : "Refresh from server"}
                    </button>
                </div>
            </Panel>

            {/* ---------- Session ---------- */}
            <Panel title="Session" subtitle="JWT held in localStorage" icon={KeyRound} padded={false}>
                <div className="px-6 py-2">
                    <Row
                        label="Status"
                        value={token ? "Authenticated" : "Signed out"}
                    />
                    <Row
                        label="Token"
                        value={
                            token
                                ? `${token.slice(0, 18)}…${token.slice(-8)}`
                                : "—"
                        }
                        mono
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-400/8 p-5">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        Sessions expire after 24 hours
                    </p>

                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                        <LogOut size={14} />
                        Log out
                    </button>
                </div>
            </Panel>

            {/* ---------- Platform ---------- */}
            <Panel title="Platform" subtitle="Runtime configuration" icon={Server} padded={false}>
                <div className="px-6 py-2">
                    <Row label="API base URL" value={API_URL} mono />
                    <Row label="Config source" value="frontend/.env → VITE_API_URL" mono />
                    <Row label="Workflow transport" value="Server-Sent Events (SSE)" />
                </div>
            </Panel>
        </div>
    );
}

export default Settings;
