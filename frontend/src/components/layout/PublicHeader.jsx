import { Link } from "react-router-dom";

function PublicHeader() {
    return (
        <header
            className="
                sticky
                top-0
                z-30
                border-b
                border-slate-200
                bg-white/90
                backdrop-blur-xl
            "
        >
            <div
                className="
                    flex
                    h-20
                    items-center
                    justify-between
                    gap-6
                    px-6
                    lg:px-8
                    xl:px-10
                "
            >
                {/* Logo */}

                <Link
                    to="/"
                    className="text-2xl font-bold text-slate-900"
                >
                    AI Company OS
                </Link>

                {/* Auth Buttons */}

                <div className="flex items-center gap-3">

                    <Link
                        to="/login"
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-slate-200
                            hover:bg-slate-50
                            px-4
                            py-2
                            text-slate-700
                            font-semibold
                            transition
                            md:px-5
                            md:py-3
                        "
                    >
                        Login
                    </Link>

                    <Link
                        to="/register"
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-xl
                            bg-violet-600
                            hover:bg-violet-700
                            px-4
                            py-2
                            text-white
                            font-semibold
                            transition
                            md:px-5
                            md:py-3
                        "
                    >
                        Register
                    </Link>

                </div>

            </div>

        </header>
    );
}

export default PublicHeader;