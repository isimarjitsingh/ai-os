import { Outlet } from "react-router-dom";

import PublicHeader from "./PublicHeader";

function PublicLayout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <PublicHeader />
            <Outlet />
        </div>
    );
}

export default PublicLayout;