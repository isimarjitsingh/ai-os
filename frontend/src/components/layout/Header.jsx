import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell } from "lucide-react";

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
    const inputRef = useRef(null);

    const { title, description } = pageMeta(location.pathname, user);
    const name = user?.name || "User";

    function handleSearch(event) {
        event.preventDefault();

        const term = query.trim();
        navigate(term ? `/projects?q=${encodeURIComponent(term)}` : "/projects");
    }

    /* ⌘K / Ctrl+K focuses the global search */
    useEffect(() => {
        function onKeyDown(event) {
            const isCommandK =
                (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

            if (!isCommandK) return;

            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

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
                <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
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
                        className="icon-btn relative shrink-0"
                        aria-label="Notifications"
                    >
                        <Bell size={16} />
                        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-[var(--color-canvas)]" />
                    </button>

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
