import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";

import ProjectDashboard from "./pages/ProjectDashboard";
import Generate from "./pages/Generate";
import Generation from "./pages/Generation";
import Projects from "./pages/Projects";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route element={<Layout />}>

                    <Route
                        path="/project/:threadId"
                        element={<ProjectDashboard />}
                    />

                    <Route
                        path="/generate"
                        element={<Generate />}
                    />

                    <Route
                        path="/generation"
                        element={<Generation />}
                    />

                    <Route
                        path="/projects"
                        element={<Projects />}
                    />

                    <Route
                        path="/agents"
                        element={<Agents />}
                    />

                    <Route
                        path="/settings"
                        element={<Settings />}
                    />

                </Route>

            </Routes>

        </BrowserRouter>

    );

}

export default App;