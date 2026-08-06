import {
    Bell,
    Search,
    Plus,
    Settings,
    ChevronDown
} from "lucide-react";

function Header() {

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

                {/* Left */}

                <div className="flex items-center gap-10 flex-1">

                    <div>

                        <h1 className="text-2xl font-bold text-slate-900">

                            Dashboard

                        </h1>

                        <p className="text-sm text-slate-500">

                            Welcome back 👋

                        </p>

                    </div>

                    {/* Search */}

                    <div
                        className="
                            hidden
                            lg:flex
                            items-center
                            gap-3
                            rounded-2xl
                            border
                            border-slate-200
                            bg-slate-50
                            px-4
                            py-3
                            w-80
                            xl:w-96
                        "
                    >

                        <Search
                            size={18}
                            className="text-slate-400"
                        />

                        <input

                            type="text"

                            placeholder="Search projects..."

                            className="
                                w-full
                                bg-transparent
                                outline-none
                                text-sm
                                placeholder:text-slate-400
                            "

                        />

                    </div>

                </div>

                {/* Right */}

                <div className="flex items-center gap-3">

                    {/* New Project */}

                    <button
                        className="
                            hidden
                            md:flex
                            items-center
                            gap-2
                            rounded-xl
                            bg-violet-600
                            hover:bg-violet-700
                            px-5
                            py-3
                            text-white
                            font-semibold
                            transition
                        "
                    >

                        <Plus size={18} />

                        New Project

                    </button>

                    {/* Notification */}

                    <button
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-slate-200
                            hover:bg-slate-100
                            transition
                        "
                    >

                        <Bell size={20} />

                    </button>

                    {/* Settings */}

                    <button
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-slate-200
                            hover:bg-slate-100
                            transition
                        "
                    >

                        <Settings size={20} />

                    </button>

                    {/* User */}

                    <button
                        className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-3
                            py-2
                            hover:bg-slate-50
                            transition
                        "
                    >

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-full
                                bg-gradient-to-br
                                from-violet-600
                                to-indigo-600
                                text-white
                                font-bold
                            "
                        >

                            S

                        </div>

                        <div className="hidden xl:block text-left">

                            <h3 className="text-sm font-semibold">

                                Simarjit

                            </h3>

                            <p className="text-xs text-slate-500">

                                Admin

                            </p>

                        </div>

                        <ChevronDown
                            size={16}
                            className="text-slate-500"
                        />

                    </button>

                </div>

            </div>

        </header>

    );

}

export default Header;