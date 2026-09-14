import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import AuthShell from "./AuthShell";
import { registerUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";

/* ==========================================================
   RegisterForm — light card, mirrors LoginForm.
   Password rules match the backend: 6 characters minimum.
========================================================== */

const LABELS = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
const BARS = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-400",
    "bg-emerald-500",
    "bg-emerald-500",
];

function strengthOf(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return password.length >= 6 ? Math.max(1, score) : 0;
}

function FieldLabel({ htmlFor, children }) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500"
        >
            {children}
        </label>
    );
}

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
                        className="font-semibold text-violet-600 transition hover:text-violet-700"
                    >
                        Sign in
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
                    <FieldLabel htmlFor="name">Full name</FieldLabel>

                    <div className="relative">
                        <User
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            id="name"
                            type="text"
                            placeholder="Ada Lovelace"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            autoComplete="name"
                            className="field-light pl-11"
                        />
                    </div>
                </div>

                <div>
                    <FieldLabel htmlFor="email">Email</FieldLabel>

                    <div className="relative">
                        <Mail
                            size={15}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                            className="field-light pl-11 pr-11"
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
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
                                                : "h-1 flex-1 rounded-full bg-slate-200"
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110 disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Creating account…
                        </>
                    ) : (
                        <>
                            Create account
                            <ArrowRight size={17} />
                        </>
                    )}
                </button>

            </form>
        </AuthShell>
    );
}

export default RegisterForm;
