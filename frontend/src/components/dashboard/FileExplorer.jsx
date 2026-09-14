import { useMemo, useState } from "react";
import {
    ChevronRight,
    ChevronDown,
    FileCode2,
    Folder,
    FolderOpen,
    Search,
} from "lucide-react";

import { cn } from "../../lib/cn";

/* ==========================================================
   FileExplorer — tree built from the project's file rows:
   { id, project_id, file_path, category }
========================================================== */

function buildTree(files) {
    const root = {};

    for (const file of files) {
        if (!file?.file_path) continue;

        const parts = String(file.file_path).split(/[\\/]+/).filter(Boolean);

        /* drop the generated_projects/<project> prefix */
        const start = parts[0] === "generated_projects" ? 2 : 0;
        const segments = parts.slice(start);

        const name = segments[segments.length - 1] || parts[parts.length - 1];
        const folders = segments.slice(0, -1);

        let cursor = root;

        for (const folder of folders) {
            cursor[folder] ??= { __dir: true, children: {} };
            cursor = cursor[folder].children;
        }

        cursor[name] = { __file: true, file };
    }

    return root;
}

function sortEntries(entries) {
    return entries.sort(([aName, a], [bName, b]) => {
        const aDir = a.__dir === true;
        const bDir = b.__dir === true;

        if (aDir !== bDir) return aDir ? -1 : 1;
        return aName.localeCompare(bName);
    });
}

function Row({ name, node, level, onOpen, selectedId }) {
    const [open, setOpen] = useState(true);
    const pad = { paddingLeft: `${0.6 + level * 0.85}rem` };

    if (node.__file) {
        const active = selectedId === node.file.id;

        return (
            <button
                onClick={() => onOpen(node.file)}
                style={pad}
                className={cn(
                    "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-xs transition",
                    active
                        ? "bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/30"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                )}
            >
                <FileCode2
                    size={13}
                    className={active ? "shrink-0 text-violet-300" : "shrink-0 text-slate-600"}
                />

                <span className="truncate">{name}</span>
            </button>
        );
    }

    const children = sortEntries(Object.entries(node.children));

    return (
        <div>
            <button
                onClick={() => setOpen((value) => !value)}
                style={pad}
                className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
            >
                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}

                {open ? (
                    <FolderOpen size={13} className="shrink-0 text-amber-400/70" />
                ) : (
                    <Folder size={13} className="shrink-0 text-amber-400/70" />
                )}

                <span className="truncate">{name}</span>
            </button>

            {open &&
                children.map(([childName, childNode]) => (
                    <Row
                        key={childName}
                        name={childName}
                        node={childNode}
                        level={level + 1}
                        onOpen={onOpen}
                        selectedId={selectedId}
                    />
                ))}
        </div>
    );
}

function FileExplorer({ files = [], onOpen, selectedId }) {
    const [filter, setFilter] = useState("");

    const tree = useMemo(() => {
        const term = filter.trim().toLowerCase();

        const filtered = term
            ? files.filter((file) =>
                  String(file.file_path || "").toLowerCase().includes(term)
              )
            : files;

        return buildTree(filtered);
    }, [files, filter]);

    const entries = sortEntries(Object.entries(tree));

    return (
        <div className="panel flex h-full flex-col">
            <div className="border-b border-slate-400/10 p-4">
                <p className="eyebrow mb-2.5">Explorer</p>

                <div className="flex items-center gap-2 rounded-lg border border-slate-400/12 bg-black/30 px-2.5 py-1.5">
                    <Search size={13} className="shrink-0 text-slate-600" />

                    <input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Filter files…"
                        className="w-full bg-transparent text-xs text-slate-300 placeholder:text-slate-600"
                    />
                </div>
            </div>

            <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2.5">
                {entries.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-slate-600">
                        {files.length === 0
                            ? "No files generated yet."
                            : "No files match that filter."}
                    </p>
                ) : (
                    entries.map(([name, node]) => (
                        <Row
                            key={name}
                            name={name}
                            node={node}
                            level={0}
                            onOpen={onOpen}
                            selectedId={selectedId}
                        />
                    ))
                )}
            </div>

            <div className="border-t border-slate-400/10 px-4 py-2.5 text-[11px] text-slate-600">
                {files.length} file{files.length === 1 ? "" : "s"}
            </div>
        </div>
    );
}

export default FileExplorer;
