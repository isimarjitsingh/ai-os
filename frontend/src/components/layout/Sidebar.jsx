import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    FolderOpen,
    Settings,
    Sparkles,
    Bot,
    X,
    LogOut,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { initials } from "../../lib/format";
import { cn } from "../../lib/cn";

/* ==========================================================
   Navigation model — every path here exists in App.jsx
========================================================== */

const GROUPS = [
    {
        label: "Workspace",
        items: [
            { name: "Dashboard", icon: LayoutDashboard, path: "/", end: true },
            { name: "Generate", icon: Sparkles, path: "/generate" },
            { name: "Projects", icon: FolderOpen, path: "/projects" },
            { name: "Agents", icon: Bot, path: "/agents" },
        ],
    },
    {
        label: "Account",
        items: [{ name: "Settings", icon: Settings, path: "/settings" }],
    },
];

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

            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col",
                    "border-r border-slate-400/10 bg-[#080a15]/95 backdrop-blur-xl",
                    "transition-transform duration-300 lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Brand */}
                <div className="flex h-16 items-center gap-3 border-b border-slate-400/10 px-5">
                    <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-violet-900/40">
                        <Sparkles size={18} className="text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold tracking-tight text-slate-100">
                            AI Company OS
                        </p>
                        <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                            Autonomous Startup Platform
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="icon-btn h-8 w-8 lg:hidden"
                        aria-label="Close navigation"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Quick action */}
                <div className="px-4 pt-5">
                    <NavLink to="/generate" onClick={onClose} className="btn-primary w-full text-sm">
                        <Sparkles size={16} />
                        New Startup
                    </NavLink>
                </div>

                {/* Nav */}
                <nav className="no-scrollbar flex-1 space-y-7 overflow-y-auto px-4 py-6">
                    {GROUPS.map((group) => (
                        <div key={group.label}>
                            <p className="eyebrow mb-2.5 px-3 text-[10px]">
                                {group.label}
                            </p>

                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.end}
                                            onClick={onClose}
                                            className={({ isActive }) =>
                                                cn(
                                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                                                    isActive
                                                        ? "bg-gradient-to-r from-violet-600/25 to-indigo-500/5 text-white ring-1 ring-inset ring-violet-400/30"
                                                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                                                )
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <Icon
                                                        size={17}
                                                        className={cn(
                                                            "shrink-0 transition",
                                                            isActive
                                                                ? "text-violet-300"
                                                                : "text-slate-500 group-hover:text-violet-300"
                                                        )}
                                                    />

                                                    <span className="truncate">{item.name}</span>

                                                    {isActive && (
                                                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>


                {/* Identity */}
                <div className="border-t border-slate-400/10 p-4">
                    <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-slate-400/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                                {initials(name)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-100">
                                    {name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {email || (isAuthenticated ? "Active session" : "Signed out")}
                                </p>
                            </div>

                            <button
                                onClick={logout}
                                title="Log out"
                                aria-label="Log out"
                                className="icon-btn h-9 w-9 hover:!border-red-400/40 hover:!bg-red-500/10 hover:!text-red-300"
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;

