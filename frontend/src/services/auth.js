import { API_URL } from "./config";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

/* ==========================================================
   TOKEN STORAGE
========================================================== */

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setStoredUser(user) {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
        /* storage full / private mode — non fatal */
    }
}

export function getAuthHeaders() {
    const token = getToken();

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/* ==========================================================
   REGISTER  →  POST /auth/register
   Response: { success, message, access_token, user }
========================================================== */

export async function registerUser(data) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.detail || "Registration failed");
    }

    return result;
}

/* ==========================================================
   LOGIN  →  POST /auth/login
   Response: { success, message, access_token, user }
========================================================== */

export async function loginUser(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.detail || "Login failed");
    }

    return result;
}

/* ==========================================================
   CURRENT USER  →  GET /auth/me
   Response: { success, user }
========================================================== */

export async function fetchCurrentUser() {
    const response = await fetch(`${API_URL}/auth/me`, {
        headers: { ...getAuthHeaders() },
        credentials: "include",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.detail || "Unable to load account");
    }

    return result.user || null;
}

/* ==========================================================
   LOGOUT  →  POST /auth/logout
   Always clears local state, even if the request fails.
========================================================== */

export async function logoutUser() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: { ...getAuthHeaders() },
            credentials: "include",
        });
    } catch {
        /* offline logout still clears the session below */
    }

    clearSession();
}
