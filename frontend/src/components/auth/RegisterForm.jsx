import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import AuthShell from "./AuthShell";
import { registerUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";

function strengthOf(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
}

const LABELS = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
const BARS = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-400"];

function RegisterForm() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const score = useMemo(() => strengthOf(password), [password]);

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const result = await registerUser({ name, email, password });

            if (result.access_token) {
                login(result.access_token, result.user);
                toast.success("Account created — welcome aboard.");
                navigate("/", { replace: true });
            } else {
                toast.success("Account created. Please sign in.");
                navigate("/login", { replace: true });
            }
        } catch (err) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Get started"
            title="Create your account"
            subtitle="One account, unlimited autonomous companies."
            footer={
                <>
                    Already registered?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-violet-300 transition hover:text-violet-200"
                    >
                        Sign in
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
                    <label className="field-label" htmlFor="name">
                        Full name
                    </label>

                    <div className="relative">
                        <User
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                        />

                        <input
                            id="name"
                            type="text"
                            placeholder="Ada Lovelace"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            autoComplete="name"
                            className="field pl-10"
                        />
                    </div>
                </div>

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
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
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

                    {password && (
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex flex-1 gap-1">
                                {[0, 1, 2, 3].map((index) => (
                                    <span
                                        key={index}
                                        className={
                                            index < score
                                                ? `h-1 flex-1 rounded-full ${BARS[score - 1]}`
                                                : "h-1 flex-1 rounded-full bg-slate-400/12"
                                        }
                                    />
                                ))}
                            </div>

                            <span className="w-16 shrink-0 text-right text-[11px] text-slate-500">
                                {LABELS[score]}
                            </span>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3.5"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Creating account…
                        </>
                    ) : (
                        <>
                            <UserPlus size={18} />
                            Create account
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
}

export default RegisterForm;

