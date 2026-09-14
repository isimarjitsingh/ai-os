/* ==========================================================
   SINGLE SOURCE OF TRUTH FOR THE API BASE URL
   Reads VITE_API_URL from .env (falls back to localhost:8000)
========================================================== */

const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_URL = rawUrl.replace(/\/+$/, "");

export default API_URL;
