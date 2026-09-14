import { useState } from "react";
import {
    Settings as SettingsIcon,
    UserRound,
    KeyRound,
    Database,
    CreditCard,
    Users,
    Bell,
    ShieldCheck,
    Monitor,
    Sun,
    Moon,
    RefreshCw,
    LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../components/ui/PageHeader";
import Switch from "../components/ui/Switch";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../services/config";
import { readPrefs, writePrefs } from "../lib/prefs";
import { INDUSTRIES, PROJECT_TYPES } from "../lib/industries";
import { formatDate, initials } from "../lib/format";
import { cn } from "../lib/cn";

/* ==========================================================
   Settings — two-column tab settings page.

   What persists: preferences are stored through lib/prefs.js
   and genuinely read back by GenerateForm. The backend has no
   profile/settings endpoint (auth is GET /auth/me +
   POST /auth/logout only), so identity and session values stay
   read-only and the key, integration, billing and team panels
   are roster content.
========================================================== */

const CRUMBS = [{ label: "Home", to: "/" }, { label: "Settings" }];

const TABS = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "keys", label: "API Keys", icon: KeyRound },
    { id: "integrations", label: "Integrations", icon: Database },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "team", label: "Team", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: ShieldCheck },
];

/* ---------------- shared bits ---------------- */

function SectionHeader({ title, hint }) {
    return (
        <div>
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
        </div>
    );
}

function Field({ label, hint, htmlFor, children, className }) {
    return (
        <div className={cn("min-w-0", className)}>
            <label className="field-label" htmlFor={htmlFor}>
                {label}
            </label>

            {children}

            {hint && <p className="mt-2 text-xs text-slate-600">{hint}</p>}
        </div>
    );
}

function ToggleRow({ title, hint, checked, onChange }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] py-4 last:border-0">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">{title}</p>
                {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
            </div>

            <Switch checked={checked} onChange={onChange} label={title} />
        </div>
    );
}

function ReadOnlyRow({ label, value, mono = false }) {
    return (
        <div className="flex flex-col gap-1 border-b border-[var(--color-line)] py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </span>

            <span
                className={cn(
                    "truncate text-sm font-medium text-slate-200 sm:max-w-md",
                    mono && "rounded-lg bg-black/40 px-2 py-1 font-mono text-xs text-slate-300"
                )}
            >
                {value || "—"}
            </span>
        </div>
    );
}

const THEME_CARDS = [
    { id: "light", label: "Light", hint: "Bright surfaces", icon: Sun },
    { id: "dark", label: "Dark", hint: "Current theme", icon: Moon },
    { id: "system", label: "System", hint: "Follow the OS", icon: Monitor },
];

/* ---------------- General ---------------- */

function GeneralSection({ draft, set }) {
    return (
        <>
            <WorkspaceSection draft={draft} set={set} />
            <AppearanceSection draft={draft} set={set} />
            <PreferencesSection draft={draft} set={set} />
        </>
    );
}

function WorkspaceSection({ draft, set }) {
    return (
        <section className="space-y-6">
            <SectionHeader
                title="Workspace Settings"
                hint="Basic information about your workspace."
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <Field
                    label="Workspace Name"
                    htmlFor="ws-name"
                    hint="Shown in the sidebar and on exported reports."
                >
                    <input
                        id="ws-name"
                        value={draft.workspaceName}
                        onChange={(event) => set("workspaceName", event.target.value)}
                        className="field"
                        placeholder="Acme Labs"
                    />
                </Field>

                <Field label="Workspace URL" htmlFor="ws-url" hint="Only the prefix is editable.">
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-[rgba(148,163,184,0.16)] bg-black/40 focus-within:border-violet-400/80">
                        <span className="hidden shrink-0 items-center rounded-l-xl border-r border-[var(--color-line)] bg-white/[0.04] px-3 py-2.5 text-xs text-slate-500 sm:flex">
                            app.aicompanyos.com/
                        </span>

                        <input
                            id="ws-url"
                            value={draft.workspaceUrl}
                            onChange={(event) =>
                                set(
                                    "workspaceUrl",
                                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                                )
                            }
                            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-200"
                            placeholder="my-workspace"
                        />
                    </div>
                </Field>
            </div>

            <Field
                label="Workspace Description"
                htmlFor="ws-desc"
                hint="Used as default context when the CEO agent plans a build."
            >
                <div className="relative">
                    <textarea
                        id="ws-desc"
                        rows={3}
                        maxLength={500}
                        value={draft.workspaceDescription}
                        onChange={(event) => set("workspaceDescription", event.target.value)}
                        placeholder="What does this team build?"
                        className="field resize-y leading-relaxed pb-9"
                    />

                    <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[11px] tabular-nums text-slate-600">
                        {draft.workspaceDescription.length}/500
                    </span>
                </div>
            </Field>
        </section>
    );
}

function AppearanceSection({ draft, set }) {
    return (
        <section className="space-y-6">
            <SectionHeader title="Appearance" hint="Choose how the console looks on this device." />

            <div className="grid gap-4 sm:grid-cols-3">
                {THEME_CARDS.map((card) => {
                    const Icon = card.icon;
                    const selected = draft.theme === card.id;
                    const light = card.id === "light";

                    return (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => set("theme", card.id)}
                            className={cn(
                                "rounded-2xl border p-4 text-left transition",
                                selected
                                    ? "border-violet-500 bg-violet-500/10"
                                    : "border-[var(--color-line)] bg-white/[0.02] hover:border-slate-500/40"
                            )}
                        >
                            <span className="flex items-start justify-between gap-3">
                                {/* mini window mock */}
                                <span
                                    className={cn(
                                        "flex h-14 w-full flex-col gap-1 rounded-lg border border-[var(--color-line)] p-1.5",
                                        light ? "bg-white" : "bg-[#0f1020]"
                                    )}
                                >
                                    <span className="h-1.5 w-2/3 rounded-full bg-violet-400/60" />
                                    <span
                                        className={cn(
                                            "h-1.5 w-full rounded-full",
                                            light ? "bg-slate-200" : "bg-slate-700"
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            "h-1.5 w-1/2 rounded-full",
                                            light ? "bg-slate-200" : "bg-slate-700"
                                        )}
                                    />
                                </span>

                                <span
                                    className={cn(
                                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                        selected ? "border-violet-400" : "border-slate-600"
                                    )}
                                >
                                    {selected && <span className="h-2 w-2 rounded-full bg-violet-400" />}
                                </span>
                            </span>

                            <span className="mt-3 flex items-center gap-2">
                                <Icon size={15} className="text-slate-400" />

                                <span className="text-sm font-semibold text-slate-100">
                                    {card.label}
                                </span>
                            </span>

                            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-slate-600">
                The console ships dark-only today — Light and System are stored as a preference and
                applied when the light palette lands.
            </p>
        </section>
    );
}

function PreferencesSection({ draft, set }) {
    return (
        <section className="space-y-6">
            <SectionHeader
                title="Default Preferences"
                hint="Starting values for every new startup brief."
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Default Industry" htmlFor="pref-industry">
                    <select
                        id="pref-industry"
                        value={draft.defaultIndustry}
                        onChange={(event) => set("defaultIndustry", event.target.value)}
                        className="field"
                    >
                        {INDUSTRIES.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Default Project Type" htmlFor="pref-type">
                    <select
                        id="pref-type"
                        value={draft.defaultProjectType}
                        onChange={(event) => set("defaultProjectType", event.target.value)}
                        className="field"
                    >
                        {PROJECT_TYPES.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] px-4">
                <ToggleRow
                    title="Auto-generate project structure"
                    hint="Write real files during every run instead of reports only."
                    checked={draft.autoGenerateStructure}
                    onChange={(next) => set("autoGenerateStructure", next)}
                />

                <ToggleRow
                    title="Suggest AI agents"
                    hint="Recommend extra departments while the CEO plans."
                    checked={draft.suggestAgents}
                    onChange={(next) => set("suggestAgents", next)}
                />
            </div>
        </section>
    );
}

/* ---------------- Roster tabs ---------------- */

const PROVIDERS = [
    { name: "OpenRouter", env: "OPENROUTER_API_KEY", scope: "CEO · research · marketing · finance · coding", state: "connected" },
    { name: "Google Gemini", env: "GOOGLE_API_KEY", scope: "Fallback reasoning chain", state: "connected" },
    { name: "Groq", env: "GROQ_API_KEY", scope: "Fast structured outputs", state: "connected" },
    { name: "xAI Grok", env: "XAI_API_KEY", scope: "Optional reasoning provider", state: "idle" },
    { name: "Tavily", env: "TAVILY_API_KEY", scope: "Live web search for the research agent", state: "connected" },
];

const INTEGRATIONS = [
    { name: "Neon Postgres", scope: "Projects, reports and generated files", state: "connected" },
    { name: "Server-Sent Events", scope: "GET /stream/{thread_id} workflow bus", state: "connected" },
    { name: "WebContainer preview", scope: "In-browser dev server for generated files", state: "idle" },
    { name: "JWT auth", scope: "24-hour tokens with SSE query fallback", state: "connected" },
];

const PLANS = [
    { name: "Starter", price: "$0", cadence: "/month", perks: "3 runs · reports only", current: true },
    { name: "Pro", price: "$49", cadence: "/month", perks: "Unlimited runs · file generation · preview" },
    { name: "Scale", price: "$199", cadence: "/month", perks: "Team seats · priority queue · SSO" },
];

const MEMBERS = [
    { role: "Owner", title: "Founder", state: "active" },
    { role: "Admin", title: "Head of Engineering", state: "active" },
    { role: "Member", title: "Growth Lead", state: "idle" },
];

function StateChip({ state }) {
    const map = {
        connected: "chip-ok",
        active: "chip-ok",
        idle: "chip-idle",
        offline: "chip-off",
    };

    return <span className={"chip " + (map[state] || "chip-idle")}>{state}</span>;
}

function RosterSection({ title, hint, rows, render }) {
    return (
        <section className="space-y-5">
            <SectionHeader title={title} hint={hint} />

            <div className="grid gap-3">
                {rows.map((row) => (
                    <div
                        key={row.name || row.role || row.price}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-4"
                    >
                        {render(row)}
                    </div>
                ))}
            </div>
        </section>
    );
}

function ProviderRow({ row }) {
    return (
        <>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">{row.name}</p>
                <p className="mt-1 font-mono text-[11px] text-violet-300">{row.env}</p>
                <p className="mt-1 text-xs text-slate-500">{row.scope}</p>
            </div>

            <StateChip state={row.state} />
        </>
    );
}

function MemberRow({ row, email }) {
    const isOwner = row.role === "Owner";

    return (
        <>
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white">
                    {initials(isOwner ? email || "Owner" : row.title)}
                </span>

                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                        {isOwner ? email || "Account owner" : row.title}
                    </p>

                    <p className="text-[11px] text-slate-500">{row.role}</p>
                </div>
            </div>

            <StateChip state={row.state} />
        </>
    );
}

function PlanRow({ row }) {
    return (
        <>
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    {row.name}

                    {row.current && <span className="chip chip-run">Current</span>}
                </p>

                <p className="mt-1 text-xs text-slate-500">{row.perks}</p>
            </div>

            <p className="shrink-0 text-right">
                <span className="text-lg font-bold text-slate-100">{row.price}</span>
                <span className="text-xs text-slate-500">{row.cadence}</span>
            </p>
        </>
    );
}

/* ---------------- Account tabs ---------------- */

function ProfileSection({ user, onRefresh, refreshing }) {
    return (
        <section className="space-y-6">
            <SectionHeader
                title="Profile"
                hint="Served by GET /auth/me. Read-only until a profile-update endpoint exists."
            />

            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white">
                    {initials(user?.name)}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-100">
                        {user?.name || "Unknown user"}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                        {user?.email || "No email on file"}
                    </p>
                </div>

                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="btn-ghost text-xs disabled:opacity-60"
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            <div className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] px-5 py-2">
                <ReadOnlyRow label="User ID" value={user?.id} mono />
                <ReadOnlyRow label="Member since" value={formatDate(user?.created_at)} />
                <ReadOnlyRow label="Display name" value={user?.name} />
            </div>
        </section>
    );
}

function NotificationsSection({ draft, set }) {
    return (
        <section className="space-y-5">
            <SectionHeader
                title="Notifications"
                hint="Stored on this device and applied by the live workflow screen."
            />

            <div className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] px-4">
                <ToggleRow
                    title="Workflow updates"
                    hint="Show live progress while agents are executing."
                    checked={draft.notifyWorkflow}
                    onChange={(next) => set("notifyWorkflow", next)}
                />

                <ToggleRow
                    title="Email summaries"
                    hint="Send a report digest when a run finishes."
                    checked={draft.notifyEmail}
                    onChange={(next) => set("notifyEmail", next)}
                />

                <ToggleRow
                    title="Product news"
                    hint="Occasional notes about new agents and capabilities."
                    checked={draft.notifyProduct}
                    onChange={(next) => set("notifyProduct", next)}
                />
            </div>
        </section>
    );
}

function SecuritySection({ token, user, onLogout, apiBase }) {
    return (
        <>
            <section className="space-y-5">
                <SectionHeader title="Security" hint="Session and platform configuration." />

                <div className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] px-5 py-2">
                    <ReadOnlyRow label="Status" value={token ? "Authenticated" : "Signed out"} />
                    <ReadOnlyRow
                        label="Token"
                        value={token ? `${token.slice(0, 18)}…${token.slice(-8)}` : "—"}
                        mono
                    />
                    <ReadOnlyRow label="API base URL" value={apiBase} mono />
                    <ReadOnlyRow
                        label="Config source"
                        value="frontend/.env → VITE_API_URL"
                        mono
                    />
                    <ReadOnlyRow label="Workflow transport" value="Server-Sent Events (SSE)" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-5">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        Sessions expire after 24 hours
                    </p>

                    <button
                        onClick={onLogout}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                        <LogOut size={14} />
                        Log out
                    </button>
                </div>
            </section>

            <section className="space-y-5">
                <SectionHeader
                    title="Access"
                    hint="Projects, reports and files are scoped to this account."
                />

                <div className="rounded-2xl border border-[var(--color-line)] bg-white/[0.02] px-5 py-2">
                    <ReadOnlyRow label="Signed in as" value={user?.email || user?.name} />
                    <ReadOnlyRow label="Seats used" value="1 of 1" />
                </div>
            </section>
        </>
    );
}

function Settings() {
    const { user, logout, refreshUser, token } = useAuth();

    const [tab, setTab] = useState("general");
    const [draft, setDraft] = useState(() => readPrefs());
    const [refreshing, setRefreshing] = useState(false);

    const saved = readPrefs();
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    function set(key, value) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    async function handleRefresh() {
        setRefreshing(true);
        await refreshUser();
        setRefreshing(false);
    }

    function handleSave() {
        writePrefs(draft);
        toast.success("Preferences saved on this device.");
    }

    function handleCancel() {
        setDraft(readPrefs());
        toast("Changes discarded", { icon: "↩" });
    }

    const panels = {
        general: <GeneralSection draft={draft} set={set} />,

        profile: (
            <ProfileSection user={user} onRefresh={handleRefresh} refreshing={refreshing} />
        ),

        keys: (
            <RosterSection
                title="Model providers"
                hint="Keys live in Backend/.env on the server — the browser never receives them."
                rows={PROVIDERS}
                render={(row) => <ProviderRow row={row} />}
            />
        ),

        integrations: (
            <RosterSection
                title="Integrations"
                hint="What the platform is wired to right now."
                rows={INTEGRATIONS}
                render={(row) => (
                    <>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{row.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.scope}</p>
                        </div>

                        <StateChip state={row.state} />
                    </>
                )}
            />
        ),

        billing: (
            <RosterSection
                title="Plans"
                hint="No payment provider is connected yet — these are the published tiers."
                rows={PLANS}
                render={(row) => <PlanRow row={row} />}
            />
        ),

        team: (
            <RosterSection
                title="Team"
                hint="Single-seat workspace until team endpoints land."
                rows={MEMBERS}
                render={(row) => <MemberRow row={row} email={user?.email} />}
            />
        ),

        notifications: <NotificationsSection draft={draft} set={set} />,

        security: (
            <SecuritySection token={token} user={user} onLogout={logout} apiBase={API_URL} />
        ),
    };

    return (
        <div className="space-y-7">
            <PageHeader
                crumbs={CRUMBS}
                eyebrow="Account"
                title="Settings"
                description="Workspace, appearance, integrations and session controls."
            />

            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                {/* ---------- Tab rail ---------- */}
                <nav className="panel h-fit p-3">
                    <ul className="space-y-1">
                        {TABS.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => setTab(item.id)}
                                    aria-current={tab === item.id ? "page" : undefined}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition",
                                        tab === item.id
                                            ? "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/30"
                                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                                    )}
                                >
                                    <item.icon size={17} />

                                    <span className="truncate">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* ---------- Content ---------- */}
                <div className="panel flex min-w-0 flex-col">
                    <div className="flex-1 space-y-10 p-5 sm:p-8">{panels[tab]}</div>

                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-line)] p-5">
                        <span className="mr-auto text-xs text-slate-600">
                            {dirty ? "Unsaved changes on this device" : "All changes saved"}
                        </span>

                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={!dirty}
                            className="btn-ghost text-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!dirty}
                            className="btn-primary text-sm disabled:opacity-50"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;








