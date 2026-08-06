import { NavLink } from "react-router-dom";
import {
    Sparkles,
    LayoutDashboard,
    Wand2,
    FolderOpen,
    Bot,
    Settings,
    Circle
} from "lucide-react";

const navigation = [
    {
        name: "Dashboard",
        icon: LayoutDashboard,
        path: "/"
    },
    {
        name: "Generate",
        icon: Wand2,
        path: "/generate"
    },
    {
        name: "Projects",
        icon: FolderOpen,
        path: "/projects"
    },
    {
        name: "Agents",
        icon: Bot,
        path: "/agents"
    },
    {
        name: "Settings",
        icon: Settings,
        path: "/settings"
    }
];

function Sidebar() {
    return (
        <aside
            className="
                hidden
                lg:flex
                w-[280px]
                shrink-0
                flex-col
                border-r
                border-slate-200
                bg-white
            "
        >
            {/* Logo */}

            <div className="border-b border-slate-200 px-7 py-7">

                <div className="flex items-center gap-4">

                    <div
                        className="
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-2xl
                            bg-gradient-to-br
                            from-violet-600
                            to-indigo-600
                            text-white
                            shadow-lg
                        "
                    >
                        <Sparkles size={22} />
                    </div>

                    <div>

                        <h1 className="text-xl font-bold text-slate-900">
                            AI Company OS
                        </h1>

                        <p className="text-sm text-slate-500">
                            Enterprise Platform
                        </p>

                    </div>

                </div>

            </div>

            {/* Navigation */}

            <div className="flex-1 overflow-y-auto px-5 py-8">

                <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Navigation
                </p>

                <nav className="space-y-2">

                    {navigation.map((item) => {

                        const Icon = item.icon;

                        return (

                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `
                                    group
                                    flex
                                    items-center
                                    gap-4
                                    rounded-2xl
                                    px-4
                                    py-3
                                    transition-all
                                    duration-200
                                    ${
                                        isActive
                                            ? "bg-violet-600 text-white shadow-lg"
                                            : "text-slate-600 hover:bg-violet-50 hover:text-violet-600"
                                    }
                                `
                                }
                            >

                                <Icon
                                    size={20}
                                    className="transition-transform group-hover:scale-110"
                                />

                                <span className="font-medium">
                                    {item.name}
                                </span>

                            </NavLink>

                        );
                    })}

                </nav>

                {/* Workspace */}

                <div className="mt-10">

                    <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Workspace
                    </p>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                        <div className="flex items-center gap-3">

                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-violet-600
                                    text-white
                                    font-bold
                                "
                            >
                                A
                            </div>

                            <div>

                                <h3 className="font-semibold text-slate-800">
                                    AI Startup
                                </h3>

                                <p className="text-sm text-slate-500">
                                    Professional Plan
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* User */}

            <div className="border-t border-slate-200 p-5">

                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">

                    <div
                        className="
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-full
                            bg-violet-600
                            font-bold
                            text-white
                        "
                    >
                        S
                    </div>

                    <div className="flex-1">

                        <h3 className="font-semibold text-slate-800">
                            Simarjit Singh
                        </h3>

                        <div className="mt-1 flex items-center gap-2">

                            <Circle
                                size={8}
                                className="fill-green-500 text-green-500"
                            />

                            <span className="text-sm text-slate-500">
                                Online
                            </span>

                        </div>

                    </div>

                </div>

            </div>

        </aside>
    );
}

export default Sidebar;