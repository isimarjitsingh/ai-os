import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout() {
    return (
        <div className="h-screen overflow-hidden bg-slate-100">

            <div className="flex h-full">

                {/* Sidebar */}

                <Sidebar />

                {/* Main Content */}

                <div className="flex min-w-0 flex-1 flex-col">

                    <Header />

                    <main className="flex-1 overflow-y-auto">

                        <div
                            className="
                                mx-auto
                                w-full
                                max-w-[1700px]
                                px-5
                                py-6
                                sm:px-6
                                lg:px-8
                                xl:px-10
                                2xl:px-12
                            "
                        >
                            <Outlet />
                        </div>

                    </main>

                </div>

            </div>

        </div>
    );
}

export default Layout;