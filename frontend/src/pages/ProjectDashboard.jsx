import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

import { getProject, getFile } from "../services/api";

import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

import ProjectHeader from "../components/dashboard/ProjectHeader";
import AgentTabs from "../components/dashboard/AgentTabs";
import OverviewPanel from "../components/dashboard/OverviewPanel";
import ReportView from "../components/dashboard/ReportView";
import FileExplorer from "../components/dashboard/FileExplorer";
import FileViewer from "../components/dashboard/FileViewer";

/* WebPreview pulls in @webcontainer/api and a large bootstrapping
   flow. It is only needed when the modal opens, so keep it out of
   the initial chunk. */
const WebPreview = lazy(() => import("../components/preview/WebPreview"));

/* ==========================================================
   ProjectDashboard — one project: reports, files, preview.

   GET /projects/{thread_id} returns:
   {
     success, project, research, marketing,
     finance, coding, ceo, files
   }
========================================================== */

const REPORT_TABS = ["research", "marketing", "finance", "coding", "ceo"];

function ProjectDashboard() {
    const { threadId } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nonce, setNonce] = useState(0);

    const [activeTab, setActiveTab] = useState("overview");

    const [selectedFile, setSelectedFile] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);

    const [showPreview, setShowPreview] = useState(false);

    /* ---------------- load ---------------- */

    useEffect(() => {
        if (!threadId) return undefined;

        let alive = true;

        getProject(threadId)
            .then((response) => {
                if (!alive) return;

                setData({
                    project: response?.project || null,
                    research: response?.research ?? null,
                    marketing: response?.marketing ?? null,
                    finance: response?.finance ?? null,
                    coding: response?.coding ?? null,
                    ceo: response?.ceo ?? null,
                    files: Array.isArray(response?.files) ? response.files : [],
                });

                setError(null);
            })
            .catch((err) => {
                if (!alive) return;

                setError(err.message || "Unable to load this project.");
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [threadId, nonce]);

    /* Manual retry is an event handler, so a synchronous
       setState here is intentional and correct. */
    function reload() {
        setLoading(true);
        setError(null);
        setNonce((value) => value + 1);
    }

    /* ---------------- open a file ---------------- */

    async function handleOpenFile(file) {
        if (!file?.id) return;

        setFileLoading(true);

        try {
            const response = await getFile(file.id);
            setSelectedFile(response?.file || null);
        } catch (err) {
            setError(err.message || "Unable to read that file.");
            setSelectedFile(null);
        } finally {
            setFileLoading(false);
        }
    }

    /* ---------------- states ---------------- */

    /* Skeleton covers first load AND a missing payload, but must not
       mask the error screen below. */
    if ((loading || !data) && !error) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-11 w-full max-w-3xl" />
                <div className="grid gap-5 lg:grid-cols-2">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <EmptyState
                    icon={AlertTriangle}
                    title="Project unavailable"
                    description={error}
                    action={
                        <div className="flex gap-3">
                            <button onClick={reload} className="btn-ghost text-xs">
                                <RefreshCw size={14} />
                                Retry
                            </button>

                            <Link to="/projects" className="btn-primary text-xs">
                                Back to projects
                            </Link>
                        </div>
                    }
                />
            </div>
        );
    }

    const { project, files } = data;

    const reports = {
        research: data.research,
        marketing: data.marketing,
        finance: data.finance,
        coding: data.coding,
        ceo: data.ceo,
    };

    return (
        <div className="space-y-6">
            <ProjectHeader
                project={project}
                fileCount={files.length}
                onPreview={() => setShowPreview(true)}
            />

            {error && (
                <div className="panel border-amber-400/25 bg-amber-500/[0.06] px-5 py-3.5 text-sm text-amber-200">
                    {error}
                </div>
            )}

            <AgentTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                fileCount={files.length}
            />

            {/* ---------------- tab body ---------------- */}
            <div>
                {activeTab === "overview" && (
                    <OverviewPanel
                        project={project}
                        reports={reports}
                        fileCount={files.length}
                    />
                )}

                {REPORT_TABS.includes(activeTab) && (
                    <ReportView
                        agent={activeTab}
                        title={activeTab}
                        report={reports[activeTab]}
                    />
                )}

                {activeTab === "files" && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                        <FileExplorer
                            files={files}
                            onOpen={handleOpenFile}
                            selectedId={selectedFile?.id}
                        />

                        <FileViewer file={selectedFile} loading={fileLoading} />
                    </div>
                )}
            </div>

            {/* ---------------- preview modal ---------------- */}
            {showPreview && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-black/80 p-3 backdrop-blur-sm sm:p-6">
                    <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-400/15 bg-[#0b0e1c] shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-400/10 px-5 py-3.5">
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-bold text-slate-100">
                                    Live preview
                                </h2>

                                <p className="truncate text-xs text-slate-500">
                                    Running {project?.project_name || "your generated app"} inside WebContainer
                                </p>
                            </div>

                            <button
                                onClick={() => setShowPreview(false)}
                                className="icon-btn shrink-0"
                                aria-label="Close preview"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1">
                            <Suspense
                                fallback={
                                    <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-500">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
                                        Loading preview runtime…
                                    </div>
                                }
                            >
                                <WebPreview threadId={threadId} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectDashboard;

