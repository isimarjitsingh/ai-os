import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import AuthShell from "./AuthShell";
import { loginUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";

const REMEMBER_KEY = "ai-os.remembered-email";

function FieldLabel({ htmlFor, children }) {
    return (
        <label
            htmlFor={htmlFor}
            className="auth-field-label mb-2 block text-[11px] font-bold uppercase tracking-[0.09em]"
        >
            {children}
        </label>
    );
}

function LoginForm() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState(() => {
        try {
            return localStorage.getItem(REMEMBER_KEY) || "";
        } catch {
            return "";
        }
    });
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(() => Boolean(email));
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const result = await loginUser(email, password);

            if (!result.access_token) {
                throw new Error("Login succeeded but no token was returned.");
            }

            try {
                if (remember) localStorage.setItem(REMEMBER_KEY, email);
                else localStorage.removeItem(REMEMBER_KEY);
            } catch {
                /* storage blocked — sign-in still works */
            }

            login(result.access_token, result.user);

            toast.success(`Welcome back${result.user?.name ? `, ${result.user.name}` : ""}`);

            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    /* No reset or OAuth routes exist on this backend, so these say
       so instead of failing silently. */
    function unavailable(provider) {
        toast(`${provider} is not wired to this backend yet.`, { icon: "⚠️" });
    }

    return (
        <AuthShell
            eyebrow="Welcome back"
            title="Welcome back"
            subtitle="Sign in to your AI Company OS account"
            footer={
                <>
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/register"
                        className="auth-secondary font-semibold transition"
                    >
                        Sign up
                    </Link>
                </>
            }
        >
            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <FieldLabel htmlFor="email">Email</FieldLabel>

                    <div className="relative">
                        <Mail
                            size={15}
                            className="auth-input-icon pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                        />

                        <input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            autoComplete="email"
                            className="field-light pl-11"
                        />
                    </div>
                </div>

                <div>
                    <FieldLabel htmlFor="password">Password</FieldLabel>

                    <div className="relative">
                        <Lock
                            size={15}
                            className="auth-input-icon pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                        />

                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            autoComplete="current-password"
                            className="field-light pl-11 pr-11"
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="auth-password-toggle absolute right-3 top-1/2 -translate-y-1/2 transition"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <label className="auth-remember flex cursor-pointer items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(event) => setRemember(event.target.checked)}
                            className="h-4 w-4 accent-violet-600"
                        />

                        Remember me
                    </label>

                    <button
                        type="button"
                        onClick={() => unavailable("Password reset")}
                        className="auth-secondary text-sm font-semibold transition"
                    >
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="auth-submit flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Signing in…
                        </>
                    ) : (
                        <>
                            Sign In
                            <ArrowRight size={17} />
                        </>
                    )}
                </button>

            </form>

            <div className="my-6 flex items-center gap-4">
                <span className="auth-divider-line h-px flex-1" />

                <span className="auth-divider-label text-xs uppercase tracking-wider">
                    or continue with
                </span>

                <span className="auth-divider-line h-px flex-1" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => unavailable("Google sign-in")}
                    className="auth-social-button rounded-xl border py-3 text-sm font-semibold transition"
                >
                    Google
                </button>

                <button
                    type="button"
                    onClick={() => unavailable("GitHub sign-in")}
                    className="auth-social-button rounded-xl border py-3 text-sm font-semibold transition"
                >
                    GitHub
                </button>
            </div>

        </AuthShell>
    );
}

export default LoginForm;
