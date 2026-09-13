import { getAuthHeaders, getToken } from "./auth";

const API_URL = "http://localhost:8000";

// ==========================================================
// GENERATE STARTUP
// ==========================================================

export async function generateProject(userGoal) {
    const response = await fetch(
        `${API_URL}/generate`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },

            credentials: "include",

            body: JSON.stringify({
                user_goal: userGoal,
            }),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to generate project"
        );
    }

    return result;
}


// ==========================================================
// WORKFLOW STREAM URL
// ==========================================================

export function getWorkflowStream(threadId, userGoal) {
    const token = getToken();

    const tokenParam = token
        ? `&token=${encodeURIComponent(token)}`
        : "";

    return (
        `${API_URL}/stream/${threadId}` +
        `?user_goal=${encodeURIComponent(userGoal)}` +
        tokenParam
    );
}


// ==========================================================
// FETCH SINGLE PROJECT
// ==========================================================

export async function getProject(threadId) {
    const response = await fetch(
        `${API_URL}/projects/${threadId}`,
        {
            headers: {
                ...getAuthHeaders(),
            },

            credentials: "include",
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Unable to fetch project"
        );
    }

    return result;
}


// ==========================================================
// FETCH ALL PROJECTS
// ==========================================================

export async function getProjects() {
    const response = await fetch(
        `${API_URL}/projects`,
        {
            headers: {
                ...getAuthHeaders(),
            },

            credentials: "include",
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Unable to fetch projects"
        );
    }

    return result;
}


// ==========================================================
// FETCH SINGLE GENERATED FILE
// ==========================================================

export async function getFile(fileId) {
    const response = await fetch(
        `${API_URL}/files/${fileId}`,
        {
            headers: {
                ...getAuthHeaders(),
            },

            credentials: "include",
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Unable to fetch file"
        );
    }

    return result;
}


// ==========================================================
// PREVIEW - FETCH GENERATED PROJECT FILES
// ==========================================================

export async function getProjectFiles(threadId) {
    const response = await fetch(
        `${API_URL}/projects/${threadId}/files`,
        {
            method: "GET",

            headers: {
                ...getAuthHeaders(),
            },

            credentials: "include",
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Unable to fetch project files"
        );
    }

    return result;
}