/* ==========================================================
   Local-only preferences.

   The backend has no profile/settings endpoint (auth is
   /auth/me + /auth/logout only), so appearance and default
   composer values are stored here and genuinely read back by
   GenerateForm — they are not decorative inputs.
========================================================== */

const KEY = "ai-os.prefs.v1";

const DEFAULTS = {
    theme: "dark",
    workspaceName: "AI Company OS",
    workspaceUrl: "my-workspace",
    workspaceDescription: "",
    defaultIndustry: "SaaS",
    defaultProjectType: "Web Application",
    autoGenerateStructure: true,
    suggestAgents: true,
    notifyWorkflow: true,
    notifyEmail: false,
    notifyProduct: false,
};

export function readPrefs() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...DEFAULTS };

        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULTS };
    }
}

export function writePrefs(patch) {
    const next = { ...readPrefs(), ...patch };

    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* private mode / quota — keep the UI responsive anyway */
    }

    return next;
}

export const PREF_DEFAULTS = DEFAULTS;
