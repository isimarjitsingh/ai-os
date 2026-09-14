import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Code2, Copy, Check, Loader2 } from "lucide-react";

import { useState } from "react";
import Editor from "@monaco-editor/react";

/* ==========================================================
   FileViewer — Monaco-backed source view.

   Monaco is only mounted for code the editor understands;
   everything else falls back to a lightweight highlighter so
   the page stays fast on large generated trees.
========================================================== */

const EDITOR_LANGUAGES = new Set([
    "javascript",
    "typescript",
    "css",
    "html",
    "json",
    "python",
    "markdown",
]);

function FileViewer({ file, loading = false }) {
    const [copied, setCopied] = useState(false);

    if (loading) {
        return (
            <div className="panel flex h-full min-h-[420px] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
        );
    }

    if (!file) {
        return (
            <div className="panel flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-400/10 ring-1 ring-inset ring-slate-400/15">
                    <Code2 size={20} className="text-slate-500" />
                </span>

                <p className="text-sm font-semibold text-slate-300">
                    Select a file to inspect
                </p>

                <p className="max-w-xs text-xs text-slate-500">
                    Pick anything from the explorer to read the source the
                    coding agent generated.
                </p>
            </div>
        );
    }

    const content = file.content ?? "";

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard blocked — non fatal */
        }
    }

    const lines = content ? content.split("\n").length : 0;

    return (
        <div className="panel flex h-full flex-col overflow-hidden">
            {/* tab bar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-400/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Code2 size={15} className="shrink-0 text-violet-300" />

                    <span className="truncate font-mono text-xs text-slate-200">
                        {file.name}
                    </span>

                    <span className="shrink-0 rounded-md bg-slate-400/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        {file.language || "plaintext"}
                    </span>
                </div>

                <button
                    onClick={handleCopy}
                    className="icon-btn h-8 w-8 shrink-0"
                    title="Copy contents"
                >
                    {copied ? (
                        <Check size={13} className="text-emerald-400" />
                    ) : (
                        <Copy size={13} />
                    )}
                </button>
            </div>

            {/* body */}
            <div className="min-h-[420px] flex-1 overflow-auto">
                {EDITOR_LANGUAGES.has(file.language) ? (
                    <Editor
                        height="100%"
                        language={file.language}
                        value={content}
                        theme="vs-dark"
                        options={{
                            readOnly: true,
                            domReadOnly: true,
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineHeight: 21,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            padding: { top: 14, bottom: 14 },
                            renderLineHighlight: "none",
                            scrollbar: {
                                verticalScrollbarSize: 9,
                                horizontalScrollbarSize: 9,
                            },
                        }}
                    />
                ) : (
                    <SyntaxHighlighter
                        language={file.language || "text"}
                        style={oneDark}
                        customStyle={{
                            margin: 0,
                            minHeight: "100%",
                            background: "transparent",
                            fontSize: "12.5px",
                        }}
                        wrapLongLines
                    >
                        {content || "// empty file"}
                    </SyntaxHighlighter>
                )}
            </div>

            <div className="border-t border-slate-400/10 px-4 py-2 text-[11px] text-slate-600">
                {lines} line{lines === 1 ? "" : "s"} ·{" "}
                {content.length.toLocaleString()} chars
            </div>
        </div>
    );
}

export default FileViewer;
