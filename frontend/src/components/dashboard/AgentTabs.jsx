import { LayoutDashboard, FolderOpen } from "lucide-react";

import { getAgent } from "../../lib/agents";
import { cn } from "../../lib/cn";

/* ==========================================================
   AgentTabs — section switcher for the project dashboard.
========================================================== */

const REPORT_TABS = ["research", "marketing", "finance", "coding", "ceo"];

function AgentTabs({ activeTab, setActiveTab, fileCount = 0, completedCount = 0 }) {
    const items = [
        {
            id: "overview",
            label: "Overview",
            icon: LayoutDashboard,
            badge: null,
        },
        ...REPORT_TABS.map((id) => {
            const agent = getAgent(id);

            return {
                id,
                label: agent ? agent.name.replace(" Agent", "") : id,
                icon: agent?.icon || LayoutDashboard,
                badge: completedCount,
            };
        }),
        {
            id: "files",
            label: "Files",
            icon: FolderOpen,
            badge: fileCount,
        },
    ];

    return (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                            active
                                ? "bg-gradient-to-r from-violet-600/30 to-indigo-500/10 text-white ring-1 ring-inset ring-violet-400/35"
                                : "text-slate-400 ring-1 ring-inset ring-slate-400/12 hover:bg-white/[0.04] hover:text-slate-200"
                        )}
                    >
                        <Icon
                            size={15}
                            className={active ? "text-violet-300" : "text-slate-500"}
                        />

                        {item.label}

                        {item.id === "files" && item.badge > 0 && (
                            <span
                                className={cn(
                                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                                    active
                                        ? "bg-violet-400/25 text-violet-100"
                                        : "bg-slate-400/10 text-slate-400"
                                )}
                            >
                                {item.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default AgentTabs;
