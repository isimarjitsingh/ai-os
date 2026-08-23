function ProjectHeader({ project }) {

    if (!project) {
        return null;
    }

    return (

        <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 text-white shadow-xl">

            <p className="text-violet-100">
                AI Company OS
            </p>

            <h1 className="mt-2 text-4xl font-bold">

                {project.project_name || "Untitled Project"}

            </h1>

            <p className="mt-4 max-w-4xl text-violet-100">

                {project.startup_idea || "No startup idea provided."}

            </p>

        </div>

    );

}

export default ProjectHeader;