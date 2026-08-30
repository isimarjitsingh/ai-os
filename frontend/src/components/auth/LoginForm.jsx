import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";


function LoginForm() {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    async function handleSubmit(e) {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const result = await loginUser(
                email,
                password
            );


            login(result.access_token, result.user);

            navigate("/");

        } catch (err) {

            setError(
                err.message || "Login failed"
            );

        } finally {

            setLoading(false);

        }

    }


    return (

        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

                <h1 className="text-3xl font-bold">
                    Welcome back
                </h1>

                <p className="mt-2 text-gray-500">
                    Login to your AI Company OS
                </p>


                {error && (

                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">

                        {error}

                    </div>

                )}


                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-4"
                >

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        required
                        autoComplete="email"
                        className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-violet-500"
                    />


                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-violet-500"
                    />


                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-violet-600 p-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                        {loading
                            ? "Logging in..."
                            : "Login"
                        }

                    </button>

                </form>


                <p className="mt-6 text-center text-sm text-gray-500">

                    Don't have an account?{" "}

                    <Link
                        to="/register"
                        className="font-semibold text-violet-600 hover:text-violet-700"
                    >
                        Create account
                    </Link>

                </p>

            </div>

        </div>

    );

}


export default LoginForm;