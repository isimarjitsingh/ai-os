const API_URL = "http://localhost:8000";


// ==========================================================
// REGISTER
// ==========================================================

export async function registerUser(data) {

    const response = await fetch(
        `${API_URL}/auth/register`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail || "Registration failed"
        );

    }

    return result;
}


// ==========================================================
// LOGIN
// ==========================================================

export async function loginUser(
    email,
    password
) {

    const response = await fetch(
        `${API_URL}/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {

        throw new Error(
            result.detail || "Login failed"
        );

    }

    return result;
}


// ==========================================================
// LOGOUT
// ==========================================================

export function logoutUser() {

    localStorage.removeItem(
        "access_token"
    );

}


// ==========================================================
// GET TOKEN
// ==========================================================

export function getToken() {

    return localStorage.getItem(
        "access_token"
    );

}


// ==========================================================
// AUTH HEADER
// ==========================================================

export function getAuthHeaders() {

    const token = getToken();

    return token
        ? {
            Authorization: `Bearer ${token}`
        }
        : {};

}