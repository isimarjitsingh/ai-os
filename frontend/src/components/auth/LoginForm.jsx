import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import toast from "react-hot-toast";

import AuthShell from "./AuthShell";
import { loginUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";

function LoginForm() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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

            login(result.access_token, result.user);

            toast.success(`Welcome back${result.user?.name ? `, ${result.user.name}` : ""}`);

            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Welcome back"
            title="Sign in to your console"
            subtitle="Pick up where your agents left off."
            footer={
                <>
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/register"
                        className="font-semibold text-violet-300 transition hover:text-violet-200"
                    >
                        Create one
                    </Link>
                </>
            }
        >
            {error && (
                <div className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="field-label" htmlFor="email">
                        Email
                    </label>

                    <div className="relative">
                        <Mail
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                        />

                        <input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            autoComplete="email"
                            className="field pl-10"
                        />
                    </div>
                </div>

                <div>
                    <label className="field-label" htmlFor="password">
                        Password
                    </label>

                    <div className="relative">
                        <Lock
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                        />

                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            autoComplete="current-password"
                            className="field pl-10 pr-11"
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3.5"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Signing in…
                        </>
                    ) : (
                        <>
                            <LogIn size={18} />
                            Sign in
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
}

export default LoginForm;
