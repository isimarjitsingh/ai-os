import { API_URL } from "./config";
import { getAuthHeaders, getToken } from "./auth";

/* ==========================================================
   SHARED REQUEST HELPER

   Every call below talks to the real FastAPI surface:

     POST  /generate
     GET   /projects
     GET   /projects/{thread_id}
     GET   /files/{file_id}
     GET   /projects/{thread_id}/files
     GET   /stream/{thread_id}   (SSE)
========================================================== */

async function request(path, { method = "GET", body, auth = true } = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        method,

        headers: {
            "Content-Type": "application/json",
            ...(auth ? getAuthHeaders() : {}),
        },

        credentials: "include",

        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const detail =
            typeof result.detail === "string"
                ? result.detail
                : result.detail?.message || `${method} ${path} failed (${response.status})`;

        const error = new Error(detail);
        error.status = response.status;
        throw error;
    }

    return result;
}

/* ==========================================================
   GENERATE STARTUP
   Returns: { success, thread_id, ... }
========================================================== */

export async function generateProject(userGoal) {
    return request("/generate", {
        method: "POST",
        body: { user_goal: userGoal },
    });
}

/* ==========================================================
   WORKFLOW STREAM URL (SSE)
   EventSource cannot send headers, so the JWT travels as a
   query param — which get_current_user() explicitly accepts.
========================================================== */

export function getWorkflowStream(threadId, userGoal) {
    const token = getToken();

    const params = new URLSearchParams({ user_goal: userGoal ?? "" });

    if (token) params.set("token", token);

    return `${API_URL}/stream/${threadId}?${params.toString()}`;
}

/* ==========================================================
   PROJECTS
========================================================== */

export async function getProjects() {
    const data = await request("/projects");
    return Array.isArray(data) ? data : [];
}

export async function getProject(threadId) {
    return request(`/projects/${threadId}`);
}

/* ==========================================================
   FILES
========================================================== */

export async function getFile(fileId) {
    return request(`/files/${fileId}`);
}

export async function getProjectFiles(threadId) {
    return request(`/projects/${threadId}/files`);
}
