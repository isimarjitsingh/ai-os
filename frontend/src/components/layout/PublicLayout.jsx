import { Outlet } from "react-router-dom";

/* ==========================================================
   PublicLayout — auth screens own their full viewport, so
   this only guarantees a dark canvas.
========================================================== */

function PublicLayout() {
    return (
        <div className="min-h-screen bg-[#05060e]">
            <Outlet />
        </div>
    );
}

export default PublicLayout;
