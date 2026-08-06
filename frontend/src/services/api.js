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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_goal: userGoal
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to generate project");
    }

    return await response.json();
}

// =========================================
// Workflow Stream URL
// =========================================

export function getWorkflowStream(threadId, userGoal) {

    return `${API_URL}/stream/${threadId}?user_goal=${encodeURIComponent(userGoal)}`;

}

// =========================================
// Fetch Single Project
// =========================================

export async function getProject(threadId) {

    const response = await fetch(
        `${API_URL}/projects/${threadId}`
    );

    if (!response.ok) {
        throw new Error("Unable to fetch project");
    }

    return await response.json();
}

// =========================================
// Fetch All Projects
// =========================================

export async function getProjects() {

    const response = await fetch(
        `${API_URL}/projects`
    );

    if (!response.ok) {
        throw new Error("Unable to fetch projects");
    }

    return await response.json();
}

export async function getFile(fileId) {

    const response = await fetch(

        `${API_URL}/files/${fileId}`

    );

    if (!response.ok) {

        throw new Error("Unable to fetch file");

    }

    return await response.json();

}