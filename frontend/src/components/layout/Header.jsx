import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Menu, Search, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { initials } from "../../lib/format";
import { longDate, pageMeta } from "../../lib/pageMeta";

/* ==========================================================
   Header — the page identity bar.

   The mockups give every screen a tall two-row masthead:
   date eyebrow → page title → description on the left, and the
   global search, notifications and avatar on the right. The
   title text lives in lib/pageMeta.js and appears nowhere else,
   so pages never repeat it inside their own body.

   It is deliberately NOT sticky: in the reference screens the
   masthead scrolls away with the page, which is what lets the
   content column start immediately below it.
========================================================== */

function Header({ onMenu }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [query, setQuery] = useState("");
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(2);
    const inputRef = useRef(null);
    const notificationsRef = useRef(null);

    const { title, description } = pageMeta(location.pathname, user);
    const name = user?.name || "User";

    function handleSearch(event) {
        event.preventDefault();

        const term = query.trim();
        navigate(term ? `/projects?q=${encodeURIComponent(term)}` : "/projects");
    }

    /* ⌘K / Ctrl+K focuses the global search. */
    useEffect(() => {
        function onKeyDown(event) {
            const isCommandK =
                (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

            if (isCommandK) {
                event.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }

            if (event.key === "Escape") setNotificationsOpen(false);
        }

        function onPointerDown(event) {
            if (!notificationsRef.current?.contains(event.target)) {
                setNotificationsOpen(false);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("pointerdown", onPointerDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("pointerdown", onPointerDown);
        };
    }, []);

    function openNotifications() {
        setNotificationsOpen((open) => !open);
        setUnreadCount(0);
    }

    /* Leave the projects screen when the box is cleared */
    function onBlurReset(event) {
        if (!event.target.value.trim() && location.pathname !== "/projects") return;
        if (!event.target.value.trim()) navigate("/projects", { replace: true });
    }

    return (
        <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-6 sm:px-6 lg:px-[var(--gutter)]">
                {/* ---------------- Identity ---------------- */}
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                        onClick={onMenu}
                        className="icon-btn mt-1 shrink-0 lg:hidden"
                        aria-label="Open navigation"
                    >
                        <Menu size={18} />
                    </button>

                    <div className="min-w-0">
                        <p className="section-label">{longDate()}</p>

                        <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-slate-50 xl:text-[32px]">
                            {title}
                        </h1>

                        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                            {description}
                        </p>
                    </div>
                </div>

                {/* ---------------- Utilities ---------------- */}
                <div ref={notificationsRef} className="relative flex shrink-0 items-center gap-2.5 sm:gap-3">
                    <form
                        onSubmit={handleSearch}
                        className="hidden w-[240px] items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-white/[0.03] px-3.5 py-2.5 transition focus-within:border-violet-400/60 focus-within:bg-white/[0.05] lg:flex xl:w-[300px]"
                    >
                        <Search size={15} className="shrink-0 text-slate-500" />

                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onBlur={onBlurReset}
                            placeholder="Search anything..."
                            aria-label="Search projects"
                            className="w-full min-w-0 bg-transparent text-sm text-slate-200 placeholder:text-slate-600"
                        />

                        <kbd className="kbd">⌘K</kbd>
                    </form>

                    <button
                        type="button"
                        onClick={openNotifications}
                        className="icon-btn relative shrink-0"
                        aria-label="Notifications"
                        aria-expanded={notificationsOpen}
                        aria-haspopup="true"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-[var(--color-canvas)]" />
                        )}
                    </button>

                    {notificationsOpen && (
                        <div
                            className="absolute right-0 top-12 z-30 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-violet-400/20 bg-[#111225]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">Notifications</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Your latest workspace activity</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNotificationsOpen(false)}
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                                    aria-label="Close notifications"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="divide-y divide-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => navigate("/projects")}
                                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
                                >
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-300">
                                        <CheckCheck size={15} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold text-slate-200">Workflow update</span>
                                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">Your latest workspace has new agent results ready to review.</span>
                                    </span>
                                    <span className="shrink-0 text-[10px] text-slate-600">2m</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/generate")}
                                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
                                >
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
                                        <Bell size={15} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold text-slate-200">Ready for a new idea?</span>
                                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">Start another workspace with a focused template.</span>
                                    </span>
                                    <span className="shrink-0 text-[10px] text-slate-600">1h</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setUnreadCount(0)}
                                className="flex w-full items-center justify-center gap-2 border-t border-white/[0.08] px-4 py-3 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/[0.08] hover:text-violet-200"
                            >
                                <CheckCheck size={13} />
                                Mark all as read
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate("/settings")}
                        title={name}
                        aria-label="Open settings"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white transition hover:brightness-110"
                    >
                        {initials(name)}
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;
