import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

/* ==========================================================
   Layout — protected application shell.

   The shell is a real two-column CSS grid at lg and above:
   column 1 is the sidebar, column 2 is everything else. The navbar sits
   in the flow rather than floating over the page, so nothing can ever
   start underneath the navbar.

   Both sides read --sidebar-w (index.css), so the width lives in one
   place and the column can never drift out of sync with the drawer.

   Below lg the sidebar leaves the layout entirely (fixed drawer + scrim)
   and the grid collapses back to a single stacked column.

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
        <div className="min-h-screen lg:grid lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]">
            <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

            <div className="flex min-h-screen min-w-0 flex-col">
                <Header onMenu={() => setNavOpen(true)} />

                {/* One shared rhythm for every screen: the same gutters
                    and the same max width, so cards line up across routes
                    exactly as they do in the mockups. */}
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-[var(--gutter)] lg:py-7">
                    <div className="mx-auto w-full max-w-[var(--content-max)]">
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
