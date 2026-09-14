import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

/* ==========================================================
   Layout — protected application shell.

   IMPORTANT: the sidebar is position:fixed, so the content
   column must reserve its width explicitly with lg:pl-64.
   Without that the sidebar overlaps the page.
========================================================== */

function Layout() {
    const [navOpen, setNavOpen] = useState(false);

    const location = useLocation();

    /* Close the mobile drawer on navigation using React's
       documented "adjust state during render" pattern —
       cheaper than an effect + extra re-render pass. */
    const [lastPath, setLastPath] = useState(location.pathname);

    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setNavOpen(false);
    }


    return (
        <div className="min-h-screen">
            <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

            <div className="flex min-h-screen flex-col lg:pl-64">
                <Header onMenu={() => setNavOpen(true)} />

                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
                    <div className="mx-auto w-full max-w-[1600px]">
                        <div key={location.pathname} className="fade-up">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Layout;
