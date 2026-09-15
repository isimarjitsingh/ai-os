import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Sparkles,
    FolderOpen,
    Bot,
    FileText,
    BarChart3,
    Settings,
    HelpCircle,
    Plus,
    X,
    LogOut,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { initials } from "../../lib/format";
import { AGENT_TOTALS } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   Navigation model — two labelled groups, matching the mockups.

   WORKSPACE holds the product surfaces, ACCOUNT holds the
   operator surfaces. Every `path` here must exist in App.jsx.

   There is no support endpoint or address in this product, so
   "Help & support" points at the in-app knowledge library
   rather than inventing a contact route.
========================================================== */

const GROUPS = [
    {
        label: "Workspace",
        items: [
            { name: "Overview", icon: LayoutDashboard, path: "/", end: true },
            { name: "Generate", icon: Sparkles, path: "/generate" },
            { name: "Projects", icon: FolderOpen, path: "/projects" },
            { name: "AI Agents", icon: Bot, path: "/agents", badge: AGENT_TOTALS.total },
            { name: "Knowledge", icon: FileText, path: "/knowledge" },
            { name: "Analytics", icon: BarChart3, path: "/analytics" },
        ],
    },
    {
        label: "Account",
        items: [
            { name: "Settings", icon: Settings, path: "/settings" },
            { name: "Help & support", icon: HelpCircle, path: "/knowledge", plain: true },
        ],
    },
];

function NavItem({ item, onNavigate }) {
    const Icon = item.icon;

    /* `plain` items are shortcuts into an existing screen, so they must
       not light up as active — that would put two highlights on the rail
       at once (e.g. Knowledge + Help & support both pointing there). */
    const classes = ({ isActive }) =>
        cn("nav-row", isActive && !item.plain && "nav-row-active");

    return (
        <li>
            <NavLink to={item.path} end={item.end} onClick={onNavigate} className={classes}>
                <Icon size={16} className="shrink-0" />

                <span className="truncate">{item.name}</span>

                {item.badge ? (
                    <span className="ml-auto shrink-0 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-300 ring-1 ring-inset ring-violet-400/25">
                        {item.badge}
                    </span>
                ) : null}
            </NavLink>
        </li>
    );
}

function Sidebar({ open = false, onClose = () => {} }) {
    const { user, logout, isAuthenticated } = useAuth();

    const name = user?.name || "Team member";
    const email = user?.email || "";

    return (
        <>
            {/* Mobile scrim */}
            <div
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden",
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
            />

            {/* Two modes, one element:
                < lg  → fixed drawer that slides in over the scrim
                ≥ lg  → sticky grid item occupying column 1 of the shell,
                        so the page is pushed right instead of covered.
                The width reads --sidebar-w, the same token Layout.jsx uses
                for its grid column — the two can never disagree. */}

            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-full w-[var(--sidebar-w)] shrink-0 flex-col",
                    "border-r border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur-xl",
                    "transition-transform duration-300 lg:sticky lg:h-screen lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Brand */}
                <div className="flex shrink-0 items-center gap-2.5 px-4 pb-4 pt-5">
                    <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-violet-900/40">
                        <Sparkles size={17} className="text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold tracking-tight text-slate-100">
                            AI Company OS
                        </p>
                        <p className="section-label mt-0.5 truncate">
                            Build smarter together
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="icon-btn h-8 w-8 shrink-0 lg:hidden"
                        aria-label="Close navigation"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Primary CTA */}
                <div className="shrink-0 px-4">
                    <NavLink to="/generate" onClick={onClose} className="btn-solid w-full">
                        <Plus size={15} />
                        New workspace
                    </NavLink>
                </div>
                {/* Grouped navigation */}
                <nav className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-7">
                    {GROUPS.map((group, groupIndex) => (
                        <div key={group.label}>
                            {groupIndex > 0 && (
                                <div className="mb-6 mt-7 h-px bg-[var(--color-line)]" />
                            )}

                            <p className="section-label px-1">{group.label}</p>

                            <ul className="mt-2.5 space-y-1">
                                {group.items.map((item) => (
                                    <NavItem
                                        key={`${group.label}-${item.name}`}
                                        item={item}
                                        onNavigate={onClose}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Upgrade card */}
                <div className="shrink-0 px-4 pb-3">
                    <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
                        <p className="text-sm font-bold leading-snug text-white">
                            Turn ideas into companies.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Autonomous teams. Real results.
                        </p>

                        <NavLink
                            to="/generate"
                            onClick={onClose}
                            className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
                        >
                            <Sparkles size={13} />
                            Upgrade plan
                        </NavLink>
                    </div>
                </div>

                {/* Identity */}
                <div className="shrink-0 border-t border-[var(--color-line)] px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white">
                            {initials(name)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-100">
                                {name}
                            </p>
                            <p className="truncate text-[11px] text-slate-600">
                                {email || (isAuthenticated ? "Active session" : "Signed out")}
                            </p>
                        </div>

                        <button
                            onClick={logout}
                            title="Log out"
                            aria-label="Log out"
                            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;

