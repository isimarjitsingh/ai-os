import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import PublicLayout from "./components/layout/PublicLayout";

import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Generation from "./pages/Generation";
import Projects from "./pages/Projects";
import ProjectDashboard from "./pages/ProjectDashboard";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute from "./routes/ProtectedRoute";


function App() {

    return (

        <Routes>

            {/* ==================================================
                PUBLIC AUTH ROUTES
            ================================================== */}

            <Route
                element={<PublicLayout />}
            >
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />
            </Route>


            {/* ==================================================
                PROTECTED APPLICATION
            ================================================== */}

            <Route
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >

                {/* HOME */}

                <Route
                    path="/"
                    element={<Home />}
                />


                {/* GENERATE */}

                <Route
                    path="/generate"
                    element={<Generate />}
                />


                {/* GENERATION */}

                <Route
                    path="/generation"
                    element={<Generation />}
                />


                {/* PROJECTS */}

                <Route
                    path="/projects"
                    element={<Projects />}
                />


                {/* PROJECT DASHBOARD */}

                <Route
                    path="/project/:threadId"
                    element={<ProjectDashboard />}
                />


                {/* AGENTS */}

                <Route
                    path="/agents"
                    element={<Agents />}
                />


                {/* SETTINGS */}

                <Route
                    path="/settings"
                    element={<Settings />}
                />

            </Route>


            {/* ==================================================
                UNKNOWN ROUTE
            ================================================== */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />

        </Routes>

    );

}

export default App;