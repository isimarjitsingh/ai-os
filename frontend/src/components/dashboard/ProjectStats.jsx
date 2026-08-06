function ProjectStats({ project }) {

    return (

        <div className="space-y-8">

            {/* Top Cards */}

            <div className="grid gap-6 md:grid-cols-3">

                <div className="rounded-2xl bg-white p-6 shadow">

                    <p className="text-sm text-slate-500">
                        Status
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-green-600">
                        {project.project.status}
                    </h2>

                </div>

                <div className="rounded-2xl bg-white p-6 shadow">

                    <p className="text-sm text-slate-500">
                        Project Folder
                    </p>

                    <h2 className="mt-2 break-all text-lg font-semibold">

                        {project.project.generated_path}

                    </h2>

                </div>

                <div className="rounded-2xl bg-white p-6 shadow">

                    <p className="text-sm text-slate-500">
                        Created
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">

                        {new Date(project.project.created_at).toLocaleString()}

                    </h2>

                </div>

            </div>


            {/* Generated Files */}

            <div className="rounded-2xl bg-white p-6 shadow">

                <h2 className="mb-5 text-2xl font-bold">

                    Generated Files

                </h2>

                {

                    project.files?.length === 0 ? (

                        <p>No generated files.</p>

                    ) : (

                        <div className="space-y-3">

                            {

                                project.files.map(file => (

                                    <div

                                        key={file.id}

                                        className="rounded-xl border p-4 hover:bg-slate-50"

                                    >

                                        <h3 className="font-semibold">

                                            {file.file_path}

                                        </h3>

                                        <p className="text-sm text-slate-500">

                                            {file.category}

                                        </p>

                                    </div>

                                ))

                            }

                        </div>

                    )

                }

            </div>

        </div>

    );

}

export default ProjectStats;