import { getAuthHeaders, getToken } from "./auth";

const API_URL = "http://localhost:8000";



// =========================================
// Generate Startup
// =========================================

export async function generateProject(userGoal) {

    const response = await fetch(
        `${API_URL}/generate`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                ...getAuthHeaders()
            },

            body: JSON.stringify({
                user_goal: userGoal
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail ||
            "Failed to generate project"
        );

    }

    return result;
}

// =========================================
// Workflow Stream URL
// =========================================

export function getWorkflowStream(threadId, userGoal) {

    const token = getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';

    return `${API_URL}/stream/${threadId}?user_goal=${encodeURIComponent(userGoal)}${tokenParam}`;

}

// =========================================
// Fetch Single Project
// =========================================

export async function getProject(threadId) {

    const response = await fetch(
        `${API_URL}/projects/${threadId}`,
        {
            headers: {
                ...getAuthHeaders()
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail ||
            "Unable to fetch project"
        );

    }

    return result;
}

// =========================================
// Fetch All Projects
// =========================================

export async function getProjects() {

    const response = await fetch(
        `${API_URL}/projects`,
        {
            headers: {
                ...getAuthHeaders()
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail ||
            "Unable to fetch projects"
        );

    }

    return result;
}

export async function getFile(fileId) {

    const response = await fetch(
        `${API_URL}/files/${fileId}`,
        {
            headers: {
                ...getAuthHeaders()
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail ||
            "Unable to fetch file"
        );

    }

    return result;
}