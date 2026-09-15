/* ==========================================================
   PAGE META — the single source of truth for the page header.

   The mockups put the page identity (date, title, description)
   in the top bar and nothing else on the screen repeats it.
   Header.jsx reads this map, so pages never render their own
   <h1> and the two can never disagree.

   Keep every key in sync with the routes declared in App.jsx.
========================================================== */

export const PAGE_META = {
    "/": {
        title: "Overview",
        description: "Here's what's happening across your AI company.",
        /* "/" is personalised, so Header builds the title itself */
        personalised: true,
    },
    "/generate": {
        title: "Generate a workspace",
        description: "Give your AI team a direction and watch the plan take shape.",
    },
    "/generation": {
        title: "Live workflow",
        description: "Watching your autonomous team execute in real time.",
    },
    "/projects": {
        title: "Your projects",
        description: "Keep every idea and deliverable in one focused workspace.",
    },
    "/agents": {
        title: "AI agents",
        description: "The autonomous team behind every workspace you build.",
    },
    "/knowledge": {
        title: "Company knowledge",
        description: "A shared source of truth your agents use in every decision.",
    },
    "/analytics": {
        title: "Workflow analytics",
        description: "Understand what your AI team is accomplishing over time.",
    },
    "/settings": {
        title: "Settings",
        description: "Shape how your workspace and AI team work for you.",
    },
};

const FALLBACK = {
    title: "Project",
    description: "Reports, files and live preview for this workspace.",
};

/* "MONDAY, SEPTEMBER 14, 2026" — the eyebrow above every page title */
export function longDate(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return "";

    return value
        .toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        .toUpperCase();
}

export function greeting(date = new Date()) {
    const hour = date.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

/* Resolve a pathname to { title, description }. Detail routes such as
   /project/:id fall back to the generic project identity. */
export function pageMeta(pathname, user) {
    const exact = PAGE_META[pathname];
    if (exact) {
        if (exact.personalised) {
            const firstName = (user?.name || "").trim().split(/\s+/)[0];
            return {
                title: `${greeting()}${firstName ? `, ${firstName}` : ""}`,
                description: exact.description,
            };
        }

        return { title: exact.title, description: exact.description };
    }

    if (pathname.startsWith("/project/")) return { ...FALLBACK };

    return { title: "AI Company OS", description: "Autonomous startup platform" };
}

export default PAGE_META;
