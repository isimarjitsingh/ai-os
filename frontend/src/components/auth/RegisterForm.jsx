import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";


function RegisterForm() {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    async function handleSubmit(e) {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const result = await registerUser({
                name,
                email,
                password
            });


            /*
             * If the backend registration endpoint
             * also returns an access token, we can
             * immediately log the user in.
             */

            if (result.access_token) {

                login(result.access_token, result.user);

                navigate("/");

            } else {

                /*
                 * If registration only creates the
                 * account, send the user to login.
                 */

                navigate("/login");

            }

        } catch (err) {

            setError(
                err.message || "Registration failed"
            );

        } finally {

            setLoading(false);

        }

    }


    return (

        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

                <h1 className="text-3xl font-bold">
                    Create your account
                </h1>

                <p className="mt-2 text-gray-500">
                    Start building your AI Company OS
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

                    {/* NAME */}

                    <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        required
                        autoComplete="name"
                        className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-violet-500"
                    />


                    {/* EMAIL */}

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


                    {/* PASSWORD */}

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-violet-500"
                    />


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-violet-600 p-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                        {loading
                            ? "Creating account..."
                            : "Create account"
                        }

                    </button>

                </form>


                <p className="mt-6 text-center text-sm text-gray-500">

                    Already have an account?{" "}

                    <Link
                        to="/login"
                        className="font-semibold text-violet-600 hover:text-violet-700"
                    >
                        Login
                    </Link>

                </p>

            </div>

        </div>

    );

}


export default RegisterForm;