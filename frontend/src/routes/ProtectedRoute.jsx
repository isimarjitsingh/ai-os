import { Navigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { useAuth } from "../context/AuthContext";

/* ==========================================================
   Route guards
========================================================== */

function Splash() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--color-canvas)]">
            <div className="brand-gradient flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl shadow-xl shadow-violet-900/40">
                <Sparkles size={22} className="text-white" />
            </div>

            <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">
                    AgentFork
                </p>
                <p className="mt-1 text-xs text-slate-500">Restoring your session…</p>
            </div>
        </div>
    );
}

export function ProtectedRoute({ children }) {
    const { isAuthenticated, initializing, error } = useAuth();

    /* Wait for /auth/me validation before bouncing to login,
       otherwise a hard refresh flashes the sign-in screen. */
    if (initializing) return <Splash />;

    if (error) {
        // Show error message then redirect to login
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8 max-w-md w-full">
                    <p className="text-red-300 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.href="/login"}
                        className="btn-primary w-full mt-4"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export function PublicRoute({ children }) {
    const { isAuthenticated, initializing } = useAuth();

    if (initializing) return <Splash />;

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
