import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    getToken,
    getStoredUser,
    setStoredUser,
    clearSession,
    fetchCurrentUser,
    logoutUser,
} from "../services/auth";

const AuthContext = createContext(null);

/* ==========================================================
   AuthProvider

   Hydrates instantly from localStorage so the UI never
   flashes a login screen, then re-validates against
   GET /auth/me in the background.
========================================================== */

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => getToken());
    const [user, setUser] = useState(() => getStoredUser());
    const [initializing, setInitializing] = useState(Boolean(getToken()));

    /* Re-validate the session once on mount */
    useEffect(() => {
        /* Without a token, `initializing` already starts false —
           nothing to do, and no synchronous state update needed. */
        if (!token) return undefined;

        let cancelled = false;

        (async () => {
            try {
                const fresh = await fetchCurrentUser();

                if (cancelled) return;

                if (fresh) {
                    setUser(fresh);
                    setStoredUser(fresh);
                }
            } catch {
                /* Token is stale or revoked — drop the session */
                if (!cancelled) {
                    clearSession();
                    setToken(null);
                    setUser(null);
                }
            } finally {
                if (!cancelled) setInitializing(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const login = useCallback((accessToken, userData = null) => {
        localStorage.setItem("access_token", accessToken);
        setToken(accessToken);

        if (userData) {
            setUser(userData);
            setStoredUser(userData);
        }
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();

        setToken(null);
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const fresh = await fetchCurrentUser();

            if (fresh) {
                setUser(fresh);
                setStoredUser(fresh);
            }

            return fresh;
        } catch {
            return null;
        }
    }, []);

    const value = {
        token,
        user,
        initializing,
        isAuthenticated: Boolean(token),
        login,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/* Co-locating the hook with its provider is the pattern React
   documents; it only costs fast-refresh granularity for this file. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }

    return context;
}

export default AuthContext;
