/* ==========================================================
   FORMATTERS + PRESENTERS
   Pure helpers shared by every page.
========================================================== */

/* ---------- text ---------- */

export function initials(name, fallback = "U") {
    if (!name || typeof name !== "string") return fallback;

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || fallback;
}

export function titleCase(value = "") {
    return String(value)
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^\s*\S/, (c) => c.toUpperCase())
        .trim();
}

export function truncate(value = "", max = 140) {
    const text = String(value).replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trimEnd()}…`;
}

/* ---------- time ---------- */

export function formatDate(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function formatTime(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function relativeTime(iso) {
    if (!iso) return "";

    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";

    const diff = Date.now() - then;
    const mins = Math.round(diff / 60000);

    if (Math.abs(mins) < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;

    return `${Math.round(months / 12)}y ago`;
}

/* ---------- status ---------- */

const STATUS_META = {
    completed: {
        label: "Completed",
        chip: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/25",
        dot: "bg-emerald-400",
    },
    running: {
        label: "Running",
        chip: "bg-violet-500/10 text-violet-200 ring-1 ring-inset ring-violet-400/30",
        dot: "bg-violet-400",
    },
    failed: {
        label: "Failed",
        chip: "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-400/25",
        dot: "bg-red-400",
    },
    waiting: {
        label: "Waiting",
        chip: "bg-slate-500/10 text-slate-400 ring-1 ring-inset ring-slate-400/20",
        dot: "bg-slate-500",
    },
};

export function statusMeta(status) {
    return STATUS_META[status] || STATUS_META.waiting;
}

export function projectStatusMeta(status) {
    if (status === "completed") return STATUS_META.completed;
    if (status === "failed") return STATUS_META.failed;
    if (status === "running") return STATUS_META.running;
    return STATUS_META.waiting;
}

/* ==========================================================
   REPORT VALUE PARSER

   Backend report columns are all SQLAlchemy Text and may hold
   raw strings, JSON arrays, or JSON objects. This normalises
   them into something a React component can render.
========================================================== */

export function parseReportValue(value) {
    if (value === null || value === undefined || value === "") {
        return { kind: "empty", data: null };
    }

    if (Array.isArray(value)) {
        return { kind: "list", data: value };
    }

    if (typeof value === "object") {
        return { kind: "object", data: value };
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return { kind: "text", data: String(value) };
    }

    const text = String(value).trim();

    /* try JSON */
    if (/^[[{]/.test(text)) {
        try {
            const parsed = JSON.parse(text);

            if (Array.isArray(parsed)) {
                return { kind: "list", data: parsed };
            }

            if (parsed && typeof parsed === "object") {
                return { kind: "object", data: parsed };
            }

            return { kind: "text", data: String(parsed) };
        } catch {
            /* not JSON — fall through to plain text */
        }
    }

    return { kind: "text", data: text };
}

/* ---------- misc ---------- */

export function countByStatus(projects = []) {
    return projects.reduce(
        (acc, project) => {
            const key = project?.status || "unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        },
        {}
    );
}

export function sortByNewest(projects = []) {
    return [...projects].sort((a, b) => {
        const av = new Date(a?.created_at || 0).getTime() || 0;
        const bv = new Date(b?.created_at || 0).getTime() || 0;
        return bv - av;
    });
}
