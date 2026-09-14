import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import PublicLayout from "./components/layout/PublicLayout";
import AppToaster from "./components/ui/AppToaster";

import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Generation from "./pages/Generation";
import Projects from "./pages/Projects";
import ProjectDashboard from "./pages/ProjectDashboard";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute, { PublicRoute } from "./routes/ProtectedRoute";

function App() {
    return (
        <>
            <Routes>
                {/* ---------------- public auth ---------------- */}
                <Route element={<PublicLayout />}>
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <Register />
                            </PublicRoute>
                        }
                    />
                </Route>

                {/* ---------------- protected app ---------------- */}
                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<Home />} />
                    <Route path="/generate" element={<Generate />} />
                    <Route path="/generation" element={<Generation />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/project/:threadId" element={<ProjectDashboard />} />
                    <Route path="/agents" element={<Agents />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>

                {/* ---------------- fallback ---------------- */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <AppToaster />
        </>
    );
}

export default App;
