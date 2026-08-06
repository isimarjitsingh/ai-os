import { useEffect, useState } from "react";
import { getProjects } from "../services/api";
import { Link } from "react-router-dom";

function Projects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProjects() {
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        loadProjects();
    }, []);

    if (loading) {
        return (
            <div className="p-10">
                Loading Projects...
            </div>
        );
    }

    return (
        <div className="space-y-8">

            <div>
                <h1 className="text-4xl font-bold">
                    Projects
                </h1>

                <p className="text-slate-500 mt-2">
                    Every startup you've generated.
                </p>
            </div>

            {projects.length === 0 && (
                <div className="rounded-3xl bg-white p-10 shadow">
                    No Projects Yet
                </div>
            )}

            <div className="grid gap-6">

                {projects.map((project) => (

                    <Link
                        key={project.thread_id}
                        to={`/project/${project.thread_id}`}
                    >

                        <div className="rounded-3xl bg-white p-6 shadow hover:shadow-xl transition">

                            <div className="flex justify-between">

                                <div>

                                    <h2 className="text-2xl font-bold">

                                        {project.project_name || "Untitled Startup"}

                                    </h2>

                                    <p className="mt-3 text-slate-500">

                                        {project.startup_idea}

                                    </p>

                                </div>

                                <div>

                                    <span
                                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                                            project.status === "completed"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-violet-100 text-violet-700"
                                        }`}
                                    >
                                        {project.status}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </Link>

                ))}

            </div>

        </div>
    );
}

export default Projects;