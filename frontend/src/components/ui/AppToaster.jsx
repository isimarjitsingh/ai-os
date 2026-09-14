import { Toaster } from "react-hot-toast";

/* ==========================================================
   AppToaster — single toast outlet for the whole app,
   so public and protected routes share one configuration.
========================================================== */

function AppToaster() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: "#0b0e1c",
                    color: "#e2e8f0",
                    border: "1px solid rgba(148,163,184,0.16)",
                    borderRadius: "14px",
                    fontSize: "14px",
                    maxWidth: "420px",
                },
                success: {
                    iconTheme: { primary: "#8b5cf6", secondary: "#ffffff" },
                },
                error: {
                    iconTheme: { primary: "#f87171", secondary: "#ffffff" },
                },
            }}
        />
    );
}

export default AppToaster;
