import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ProjectHeader from "../components/dashboard/ProjectHeader";
import ProjectStats from "../components/dashboard/ProjectStats";
import { getProject, getFile } from "../services/api";
import GeneratedFiles from "../components/dashboard/GeneratedFiles";
import FileViewer from "../components/dashboard/FileViewer";
import AgentTabs from "../components/dashboard/AgentTabs";

import ResearchReport from "../components/dashboard/reports/ResearchReport";
import MarketingReport from "../components/dashboard/reports/MarketingReport";
import FinanceReport from "../components/dashboard/reports/FinanceReport";
import CEOReport from "../components/dashboard/reports/CEOReport";
import CodingReport from "../components/dashboard/reports/CodingReport";
import OverviewTab from "../components/dashboard/reports/OverviewTab";

function ProjectDashboard() {

    const { threadId } = useParams();

    const [project, setProject] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);

    const [activeTab, setActiveTab] = useState("files");

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        async function loadProject() {

            try {

                const response = await getProject(threadId);
                console.log(response);
                setProject(response);

                if (response.files?.length > 0) {

                    const firstFile = await getFile(response.files[0].id);

                    setSelectedFile(firstFile.file);

                }

            }

            catch (err) {

                console.error(err);

            }

            finally {

                setLoading(false);

            }

        }

        loadProject();

    }, [threadId]);


    async function openFile(fileId) {
        console.log("Opening:", fileId);
        try {

            const response = await getFile(fileId);
            console.log(response);
            setSelectedFile(response.file);
 
        }

        catch (err) {

            console.error(err);

        }

    }

    console.log(project);
    if (loading) {

        return (

            <div className="flex h-screen items-center justify-center">

                Loading Project...

            </div>

        );

    }

    if (!project) {

        return (

            <div className="flex h-screen items-center justify-center">

                Project Not Found

            </div>

        );

    }

   return (

        <div className="mx-auto max-w-7xl space-y-8">

            <ProjectHeader
                project={project}
            />

            <div className="grid gap-8 lg:grid-cols-3">

                <AgentTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                {
                    activeTab === "files" && (

                        <div className="grid gap-8 lg:grid-cols-3">

                            <div>

                                <GeneratedFiles
                                    files={project.files}
                                    onOpen={openFile}
                                />

                            </div>

                            <div className="lg:col-span-2">

                                <FileViewer
                                    file={selectedFile}
                                />

                            </div>

                            

                        </div>

                    )
                }

                {activeTab === "research" && (
                    <ResearchReport
                        report={project.research}
                    />
                )}



                {activeTab === "marketing" && (
                    <MarketingReport
                        report={project.marketing}
                    />
                )}

                {activeTab === "finance" && (
                    <FinanceReport
                        report={project.finance}
                    />
                )}

                {activeTab === "ceo" && (
                    <CEOReport
                        report={project.ceo}
                    />
                )}

                {activeTab === "coding" && (
                    <CodingReport
                        report={project.coding}
                    />
                )}

            </div>
             
        </div>

    );

}

export default ProjectDashboard;