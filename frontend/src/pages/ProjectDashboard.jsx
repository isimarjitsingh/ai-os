import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";

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

import WebPreview from "../components/preview/WebPreview";


function ProjectDashboard() {

    const { threadId } = useParams();

    const [project, setProject] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);

    const [activeTab, setActiveTab] = useState("overview");

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    // WebContainer preview state
    const [showPreview, setShowPreview] = useState(false);


    // ==========================================================
    // LOAD PROJECT
    // ==========================================================

    const loadProject = useCallback(async (showLoading = false) => {

        if (!threadId) {
            return;
        }

        try {

            if (showLoading) {
                setLoading(true);
            }

            const response = await getProject(threadId);

            console.log("📦 PROJECT RESPONSE:", response);


            // ==================================================
            // NORMALIZE BACKEND RESPONSE
            // ==================================================

            /*
             * Backend response is expected to look roughly like:
             *
             * {
             *     success: true,
             *     project: {...},
             *     research: {...},
             *     marketing: {...},
             *     finance: {...},
             *     coding: {...},
             *     ceo: {...},
             *     files: [...]
             * }
             *
             * The actual project metadata is inside response.project,
             * while reports/files may be siblings.
             */

            const baseProject = response?.project || response;


            const projectData = {

                ...baseProject,

                // Reports
                research:
                    response?.research ??
                    baseProject?.research ??
                    null,

                marketing:
                    response?.marketing ??
                    baseProject?.marketing ??
                    null,

                finance:
                    response?.finance ??
                    baseProject?.finance ??
                    null,

                coding:
                    response?.coding ??
                    baseProject?.coding ??
                    null,

                ceo:
                    response?.ceo ??
                    response?.final_report ??
                    baseProject?.ceo ??
                    null,

                // Generated files
                files:
                    response?.files ??
                    baseProject?.files ??
                    [],

            };


            console.log(
                "📊 NORMALIZED PROJECT DATA:",
                projectData
            );


            console.log(
                "💻 CODING REPORT:",
                projectData.coding
            );


            console.log(
                "📁 GENERATED FILES:",
                projectData.files
            );


            console.log(
                "🔬 RESEARCH REPORT:",
                projectData.research
            );


            console.log(
                "📣 MARKETING REPORT:",
                projectData.marketing
            );


            console.log(
                "💰 FINANCE REPORT:",
                projectData.finance
            );


            console.log(
                "👔 CEO REPORT:",
                projectData.ceo
            );


            setProject(projectData);


            // ==================================================
            // LOAD FIRST GENERATED FILE
            // ==================================================

            if (
                projectData.files &&
                Array.isArray(projectData.files) &&
                projectData.files.length > 0
            ) {

                const firstFile = projectData.files[0];


                /*
                 * Some APIs return:
                 *
                 * { id: 1, file_name: "App.jsx" }
                 *
                 * while others return:
                 *
                 * { file_id: 1 }
                 */

                const fileId =
                    firstFile?.id ??
                    firstFile?.file_id;


                if (fileId) {

                    try {

                        const fileResponse = await getFile(fileId);

                        console.log(
                            "📄 FIRST FILE:",
                            fileResponse
                        );


                        setSelectedFile(
                            fileResponse?.file ||
                            fileResponse
                        );


                    } catch (fileError) {

                        console.error(
                            "❌ Failed to load first file:",
                            fileError
                        );

                        setSelectedFile(null);

                    }

                }

            } else {

                setSelectedFile(null);

            }


        } catch (err) {

            console.error(
                "❌ Failed to load project:",
                err
            );

        } finally {

            if (showLoading) {
                setLoading(false);
            }

        }

    }, [threadId]);


    // ==========================================================
    // INITIAL LOAD
    // ==========================================================

    useEffect(() => {

        loadProject(true);

    }, [loadProject]);


    // ==========================================================
    // AUTO REFRESH WHILE WORKFLOW IS RUNNING
    // ==========================================================

    useEffect(() => {

        if (!threadId || !project) {
            return;
        }


        if (
            project.status === "completed" ||
            project.status === "failed"
        ) {
            return;
        }


        setRefreshing(true);


        const interval = setInterval(async () => {

            console.log(
                "🔄 Refreshing project..."
            );

            await loadProject(false);

        }, 3000);


        return () => {

            clearInterval(interval);

            setRefreshing(false);

        };

    }, [
        threadId,
        project?.status,
        loadProject
    ]);


    // ==========================================================
    // OPEN FILE
    // ==========================================================

    async function openFile(fileId) {

        console.log(
            "📂 Opening file:",
            fileId
        );


        try {

            const response = await getFile(fileId);

            console.log(
                "📄 FILE RESPONSE:",
                response
            );


            setSelectedFile(
                response?.file ||
                response
            );


        } catch (err) {

            console.error(
                "❌ Failed to open file:",
                err
            );

        }

    }


    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading) {

        return (

            <div className="flex h-screen items-center justify-center">

                <div className="text-center">

                    <div className="mb-3 text-lg font-semibold">
                        Loading Project...
                    </div>

                    <div className="text-sm text-gray-500">
                        Preparing your AI Company workspace
                    </div>

                </div>

            </div>

        );

    }


    // ==========================================================
    // PROJECT NOT FOUND
    // ==========================================================

    if (!project) {

        return (

            <div className="flex h-screen items-center justify-center">

                <div className="text-center">

                    <div className="text-xl font-semibold">
                        Project Not Found
                    </div>

                    <div className="mt-2 text-gray-500">
                        No project exists for this workflow.
                    </div>

                </div>

            </div>

        );

    }


    // ==========================================================
    // DEBUG
    // ==========================================================

    console.log(
        "🎯 CURRENT PROJECT:",
        project
    );


    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <div className="mx-auto max-w-7xl space-y-8">


            {/* ==================================================
                HEADER
            ================================================== */}

            <ProjectHeader
                project={project}
            />


            {/* ==================================================
                STATUS
            ================================================== */}

            {refreshing && (

                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">

                    AI agents are still working...
                    Project data will refresh automatically.

                </div>

            )}


            {project.status === "completed" && (

                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

                    ✓ Workflow completed successfully.

                </div>

            )}


            {project.status === "failed" && (

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    ✕ Workflow failed.

                </div>

            )}


            {/* ==================================================
                STATS
            ================================================== */}

            {/*
            <ProjectStats
                project={project}
            />
            */}


            {/* ==================================================
                WEBSITE PREVIEW BUTTON
            ================================================== */}

            {project.status === "completed" && (

                <div className="flex justify-end">

                    <button
                        onClick={() => setShowPreview(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
                    >

                        <span>
                            ▶
                        </span>

                        Preview Website

                    </button>

                </div>

            )}


            {/* ==================================================
                TABS
            ================================================== */}

            <div className="space-y-8">

                <AgentTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />


                {/* ==================================================
                    OVERVIEW
                ================================================== */}

                {activeTab === "overview" && (

                    <OverviewTab
                        project={project}
                    />

                )}


                {/* ==================================================
                    FILES
                ================================================== */}

                {activeTab === "files" && (

                    <div className="grid gap-8 lg:grid-cols-3">


                        <div>

                            <GeneratedFiles
                                files={project.files || []}
                                onOpen={openFile}
                            />

                        </div>


                        <div className="lg:col-span-2">

                            <FileViewer
                                file={selectedFile}
                            />

                        </div>


                    </div>

                )}


                {/* ==================================================
                    RESEARCH
                ================================================== */}

                {activeTab === "research" && (

                    <ResearchReport
                        report={project.research}
                    />

                )}


                {/* ==================================================
                    MARKETING
                ================================================== */}

                {activeTab === "marketing" && (

                    <MarketingReport
                        report={project.marketing}
                    />

                )}


                {/* ==================================================
                    FINANCE
                ================================================== */}

                {activeTab === "finance" && (

                    <FinanceReport
                        report={project.finance}
                    />

                )}


                {/* ==================================================
                    CODING
                ================================================== */}

                {activeTab === "coding" && (

                    <CodingReport
                        report={project.coding}
                    />

                )}


                {/* ==================================================
                    CEO
                ================================================== */}

                {activeTab === "ceo" && (

                    <CEOReport
                        report={project.ceo}
                    />

                )}

            </div>


            {/* ==================================================
                WEB CONTAINER PREVIEW MODAL
            ================================================== */}

            {showPreview && (

                <div className="fixed inset-0 z-50 bg-black/60 p-4">

                    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">


                        {/* ==================================================
                            PREVIEW HEADER
                        ================================================== */}

                        <div className="flex items-center justify-between border-b px-5 py-3">


                            <div>

                                <h2 className="text-lg font-semibold text-gray-900">

                                    Live Website Preview

                                </h2>


                                <p className="text-xs text-gray-500">

                                    Running your generated frontend inside WebContainer

                                </p>

                            </div>


                            <button
                                onClick={() => setShowPreview(false)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            >

                                ✕ Close

                            </button>


                        </div>


                        {/* ==================================================
                            WEB PREVIEW
                        ================================================== */}

                        <div className="min-h-0 flex-1">

                            <WebPreview
                                threadId={threadId}
                            />

                        </div>


                    </div>

                </div>

            )}

        </div>

    );

}


export default ProjectDashboard;