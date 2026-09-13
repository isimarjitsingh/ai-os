import { WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState } from "react";
import { getProjectFiles } from "../../services/api";

// ==========================================================
// WebContainer Singleton (Stored on window to survive HMR & re-renders)
// ==========================================================

async function getWebContainer() {
    if (typeof window !== "undefined" && window.__webContainerInstance) {
        return window.__webContainerInstance;
    }

    if (typeof window !== "undefined" && window.__webContainerPromise) {
        return window.__webContainerPromise;
    }

    const bootPromise = (async () => {
        try {
            const instance = await WebContainer.boot({
                coep: "require-corp",
            });
            if (typeof window !== "undefined") {
                window.__webContainerInstance = instance;
            }
            return instance;
        } catch (error) {
            // Handle HMR edge case where instance was already booted in this window
            if (error?.message?.includes("Only a single WebContainer instance can be booted")) {
                if (typeof window !== "undefined" && window.__webContainerInstance) {
                    return window.__webContainerInstance;
                }
                // If the reference was lost before this fix, inform user to refresh the page
                throw new Error(
                    "A WebContainer instance is already active from a previous session. Please refresh this browser tab (Press F5 or Ctrl+R) to reconnect."
                );
            }
            if (typeof window !== "undefined") {
                window.__webContainerPromise = null;
            }
            throw error;
        }
    })();

    if (typeof window !== "undefined") {
        window.__webContainerPromise = bootPromise;
    }

    return bootPromise;
}

// ==========================================================
// Extract File Contents
// ==========================================================

function extractFileContents(file) {
    if (!file) return null;
    if (typeof file === "string") return file;
    if (file.file && typeof file.file === "object" && file.file.contents !== undefined) {
        return file.file.contents;
    }
    if (file.contents !== undefined) return file.contents;
    if (file.content !== undefined) return file.content;
    if (file.file_content !== undefined) return file.file_content;
    return null;
}

// ==========================================================
// Parse package.json
// ==========================================================

function parsePackageJson(packageFile) {
    const contents = extractFileContents(packageFile);

    if (contents === null) {
        throw new Error("Could not extract package.json contents.");
    }

    if (typeof contents === "object" && !Array.isArray(contents)) {
        return contents;
    }

    if (typeof contents !== "string") {
        throw new Error("package.json contents are not valid text.");
    }

    try {
        return JSON.parse(contents);
    } catch (error) {
        console.error("[WebPreview] Invalid package.json:", contents);
        throw new Error("Generated package.json contains invalid JSON.");
    }
}

// ==========================================================
// Detect Missing Dependencies from Source Files
// ==========================================================

function detectMissingDependencies(filesTree, existingDependencies) {
    const missing = {};
    const knownPackages = {
        "lodash.debounce": "^4.0.8",
        "lodash": "^4.17.21",
        "dayjs": "^1.11.10",
        "axios": "^1.7.2",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.3.0",
        "lucide-react": "^0.395.0",
        "@emotion/react": "^11.11.0",
        "@emotion/styled": "^11.11.0",
        "@mui/material": "^5.15.0",
        "@mui/icons-material": "^5.15.0",
        "react-router-dom": "^6.22.0",
        "@reduxjs/toolkit": "^2.2.0",
        "react-redux": "^9.1.0",
        "socket.io-client": "^4.7.2"
    };

    function collectContents(node) {
        let contents = [];
        if (!node || typeof node !== "object") return contents;
        for (const key of Object.keys(node)) {
            const val = node[key];
            if (val && typeof val === "object") {
                const text = extractFileContents(val);
                if (typeof text === "string") {
                    contents.push({ name: key, content: text });
                } else if (val.directory) {
                    contents = contents.concat(collectContents(val.directory));
                } else {
                    contents = contents.concat(collectContents(val));
                }
            }
        }
        return contents;
    }

    const allFiles = collectContents(filesTree);
    const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'".\s/][^'"]*)['"]|require\(['"]([^'".\s/][^'"]*)['"]\))/g;

    for (const { content } of allFiles) {
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const pkg = match[1] || match[2];
            if (!pkg) continue;

            let basePkg = pkg;
            if (pkg.startsWith("@")) {
                const parts = pkg.split("/");
                basePkg = parts.slice(0, 2).join("/");
            } else {
                basePkg = pkg.split("/")[0];
            }

            if (["path", "fs", "os", "http", "https", "url", "events", "stream", "crypto"].includes(basePkg)) {
                continue;
            }

            if (!existingDependencies[basePkg]) {
                missing[basePkg] = knownPackages[basePkg] || "latest";
            }
        }
    }

    return missing;
}

// ==========================================================
// Validate npm package name (URL-friendly, no # . / etc.)
// ==========================================================

function isValidNpmPackageName(name) {
    if (typeof name !== "string" || name.length === 0) return false;
    if (name.includes("#")) return false;
    if (name.startsWith(".") || name.startsWith("/")) return false;
    if (/\s/.test(name)) return false;
    if (name.startsWith("@")) {
        return /^@[a-z0-9_.\-]+\/[a-z0-9_.\-]+$/i.test(name);
    }
    return /^[a-z0-9_.\-]+$/i.test(name);
}

function stripInvalidDeps(deps) {
    const cleaned = {};
    for (const [name, version] of Object.entries(deps || {})) {
        if (isValidNpmPackageName(name)) {
            cleaned[name] = version;
        } else {
            console.warn(`[WebPreview] Removing invalid package name: "${name}"`);
        }
    }
    return cleaned;
}

// ==========================================================
// Normalize package.json
// ==========================================================

function normalizePackageJson(packageJson, rawFilesTree) {
    const normalized = {
        ...packageJson,
    };

    let dependencies = {
        ...(normalized.dependencies || {}),
    };

    let devDependencies = {
        ...(normalized.devDependencies || {}),
    };

    // Strip invalid package names (e.g. "#/api") that cause EINVALIDPACKAGENAME
    dependencies = stripInvalidDeps(dependencies);
    devDependencies = stripInvalidDeps(devDependencies);

    // React Router Types cleanup
    delete dependencies["@types/react-router-dom"];
    delete devDependencies["@types/react-router-dom"];

    // Detect if CRA is used
    const hasReactScripts = Boolean(
        dependencies["react-scripts"] || devDependencies["react-scripts"]
    );

    if (hasReactScripts) {
        devDependencies.ajv = "^8.17.1";
        devDependencies["ajv-keywords"] = "^5.1.0";
    }

    // Auto-detect any missing imported dependencies
    const allExisting = { ...dependencies, ...devDependencies };
    const missing = detectMissingDependencies(rawFilesTree, allExisting);

    for (const [pkg, ver] of Object.entries(missing)) {
        if (isValidNpmPackageName(pkg)) {
            console.log(`[WebPreview] Auto-adding missing dependency: ${pkg}@${ver}`);
            dependencies[pkg] = ver;
        }
    }

    // Ensure Vite devDependencies if Vite is in scripts
    const isVite = Boolean(
        dependencies.vite ||
        devDependencies.vite ||
        packageJson.scripts?.dev?.includes("vite") ||
        packageJson.scripts?.start?.includes("vite")
    );

    if (isVite) {
        if (!devDependencies["@vitejs/plugin-react"] && !dependencies["@vitejs/plugin-react"]) {
            devDependencies["@vitejs/plugin-react"] = "^4.3.0";
        }
        if (!devDependencies.vite && !dependencies.vite) {
            devDependencies.vite = "^5.2.0";
        }
    }

    normalized.dependencies = dependencies;
    normalized.devDependencies = devDependencies;

    return normalized;
}


// ==========================================================
// Convert Backend File Tree To WebContainer Tree
// ==========================================================

function normalizeWebContainerFileTree(tree) {
    if (!tree || typeof tree !== "object") {
        return tree;
    }

    const result = {};

    for (const [fileName, fileValue] of Object.entries(tree)) {
        if (!fileValue) continue;

        // String
        if (typeof fileValue === "string") {
            result[fileName] = {
                file: { contents: fileValue },
            };
            continue;
        }

        // Already WebContainer file format
        if (fileValue.file && typeof fileValue.file === "object" && fileValue.file.contents !== undefined) {
            result[fileName] = {
                file: {
                    ...fileValue.file,
                    contents: fileValue.file.contents,
                },
            };
            continue;
        }

        // contents property
        if (fileValue.contents !== undefined) {
            result[fileName] = {
                file: { contents: fileValue.contents },
            };
            continue;
        }

        // content property
        if (fileValue.content !== undefined) {
            result[fileName] = {
                file: { contents: fileValue.content },
            };
            continue;
        }

        // Directory
        if (typeof fileValue === "object" && !Array.isArray(fileValue)) {
            result[fileName] = normalizeWebContainerFileTree(fileValue);
            continue;
        }

        result[fileName] = fileValue;
    }

    return result;
}

// ==========================================================
// Find Frontend Directory
// ==========================================================

function getFrontendDirectory(projectData) {
    if (!projectData?.files) {
        throw new Error("No generated project files were returned.");
    }

    const files = projectData.files;

    if (files.frontend?.directory && typeof files.frontend.directory === "object") {
        return files.frontend.directory;
    }

    if (files.frontend && typeof files.frontend === "object" && !Array.isArray(files.frontend)) {
        if (files.frontend["package.json"] || files.frontend.src || files.frontend["src"]) {
            return files.frontend;
        }
    }

    if (files["package.json"] || files.src || files["src"]) {
        return files;
    }

    for (const [key, value] of Object.entries(files)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;

        if (value["package.json"] || value.src || value["src"]) {
            return value;
        }

        if (value.directory && typeof value.directory === "object") {
            const directory = value.directory;
            if (directory["package.json"] || directory.src || directory["src"]) {
                return directory;
            }
        }
    }

    throw new Error("Unable to locate the generated frontend directory.");
}

// ==========================================================
// Prepare Frontend Files (Auto-Fix Vite, HTML, Router, Slices)
// ==========================================================

function prepareFrontendFiles(frontendTree, packageJson) {
    const isVite = Boolean(
        packageJson.dependencies?.vite ||
        packageJson.devDependencies?.vite ||
        packageJson.scripts?.dev?.includes("vite") ||
        packageJson.scripts?.start?.includes("vite")
    );

    // 1. Detect entry point script in src
    let entryFile = "src/index.tsx";
    const srcNode = frontendTree.src?.directory || frontendTree.src;
    if (srcNode) {
        const candidates = [
            "index.tsx", "main.tsx", "index.jsx", "main.jsx", "index.js", "main.js", "App.tsx", "App.jsx"
        ];
        for (const c of candidates) {
            if (srcNode[c]) {
                entryFile = `src/${c}`;
                break;
            }
        }
    }

    // 2. Locate or create index.html
    let htmlContent = "";
    if (frontendTree["index.html"]) {
        htmlContent = extractFileContents(frontendTree["index.html"]);
    } else if (frontendTree.public?.directory?.["index.html"]) {
        htmlContent = extractFileContents(frontendTree.public.directory["index.html"]);
    } else if (frontendTree.public?.["index.html"]) {
        htmlContent = extractFileContents(frontendTree.public["index.html"]);
    }

    if (!htmlContent) {
        htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${packageJson.name || "Live Preview"}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    }

    // Replace %PUBLIC_URL% placeholders
    htmlContent = htmlContent.replace(/%PUBLIC_URL%\/?/g, "/");

    if (isVite) {
        // Ensure root div exists
        if (!htmlContent.includes('id="root"')) {
            if (htmlContent.includes("</body>")) {
                htmlContent = htmlContent.replace("</body>", '  <div id="root"></div>\n  </body>');
            } else {
                htmlContent += '\n<div id="root"></div>';
            }
        }

        // Ensure module entry script tag exists
        if (!htmlContent.includes('<script type="module"')) {
            const scriptTag = `\n    <script type="module" src="/${entryFile}"></script>\n  `;
            if (htmlContent.includes("</body>")) {
                htmlContent = htmlContent.replace("</body>", `${scriptTag}</body>`);
            } else {
                htmlContent += scriptTag;
            }
        }

        // Vite requires index.html at root
        frontendTree["index.html"] = {
            file: { contents: htmlContent },
        };

        // Ensure vite.config.js / vite.config.ts exists
        if (!frontendTree["vite.config.js"] && !frontendTree["vite.config.ts"]) {
            frontendTree["vite.config.js"] = {
                file: {
                    contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
});
`,
                },
            };
        }

        // If vite.config.js contains TypeScript syntax (e.g. "as Type", generic type params),
        // esbuild will fail to parse it. Rename it to vite.config.ts so Vite handles it correctly.
        if (frontendTree["vite.config.js"]) {
            const viteConfigContent = extractFileContents(frontendTree["vite.config.js"]);
            const hasTypeSyntax =
                typeof viteConfigContent === "string" &&
                (
                    /\bas\s+[A-Z][A-Za-z<>,\s[\]]+/.test(viteConfigContent) || // `as Record<...>`, `as string`, etc.
                    /:\s*[A-Z][A-Za-z<>,\s[\]]+\s*[=;,){}]/.test(viteConfigContent) || // `: Record<string,string>`
                    /import\s+type\s/.test(viteConfigContent) ||                 // `import type ...`
                    /satisfies\s+[A-Z]/.test(viteConfigContent)                  // `satisfies UserConfig`
                );
            if (hasTypeSyntax) {
                console.log("[WebPreview] vite.config.js has TypeScript syntax — renaming to vite.config.ts");
                frontendTree["vite.config.ts"] = frontendTree["vite.config.js"];
                delete frontendTree["vite.config.js"];
            }
        }
    } else {
        // CRA requires public/index.html
        if (!frontendTree.public) {
            frontendTree.public = { directory: {} };
        } else if (!frontendTree.public.directory) {
            frontendTree.public = { directory: { ...frontendTree.public } };
        }
        frontendTree.public.directory["index.html"] = {
            file: { contents: htmlContent },
        };
    }

    // 3. Fix nested Router collision between index.tsx and App.tsx
    if (srcNode) {
        const appNode = srcNode["App.tsx"] || srcNode["App.jsx"];
        const indexNode = srcNode["index.tsx"] || srcNode["index.jsx"];

        if (appNode && indexNode) {
            const appText = extractFileContents(appNode);
            const indexText = extractFileContents(indexNode);

            const hasRouterInIndex = indexText && (indexText.includes("<BrowserRouter") || indexText.includes("<Router"));
            const hasRouterInApp = appText && (appText.includes("<BrowserRouter") || appText.includes("<Router"));

            if (hasRouterInIndex && hasRouterInApp) {
                console.log("[WebPreview] Fixing nested Router in App component...");
                const patchedApp = appText
                    .replace(/<Router\b[^>]*>/g, "<React.Fragment>")
                    .replace(/<\/Router>/g, "</React.Fragment>")
                    .replace(/<BrowserRouter\b[^>]*>/g, "<React.Fragment>")
                    .replace(/<\/BrowserRouter>/g, "</React.Fragment>");

                if (srcNode["App.tsx"]) {
                    srcNode["App.tsx"] = { file: { contents: patchedApp } };
                } else if (srcNode["App.jsx"]) {
                    srcNode["App.jsx"] = { file: { contents: patchedApp } };
                }
            }
        }

        // 4. Check for Redux store and missing slice imports
        const storeDir = srcNode.store?.directory || srcNode.store;
        if (storeDir && (storeDir["store.ts"] || storeDir["store.js"])) {
            const storeText = extractFileContents(storeDir["store.ts"] || storeDir["store.js"]);
            const sliceImportMatches = storeText?.matchAll(/from\s+['"](\.\/slices\/[^'"]+)['"]/g);

            if (sliceImportMatches) {
                if (!storeDir.slices) {
                    storeDir.slices = { directory: {} };
                }
                const slicesDir = storeDir.slices.directory || storeDir.slices;

                for (const match of sliceImportMatches) {
                    const slicePath = match[1]; // e.g., './slices/authSlice'
                    const sliceFileName = slicePath.split("/").pop(); // 'authSlice'
                    const targetFile = `${sliceFileName}.ts`;

                    if (!slicesDir[targetFile] && !slicesDir[`${sliceFileName}.js`]) {
                        console.log(`[WebPreview] Auto-generating missing slice: ${targetFile}`);
                        slicesDir[targetFile] = {
                            file: {
                                contents: `import { createSlice } from '@reduxjs/toolkit';
export const ${sliceFileName} = createSlice({
  name: '${sliceFileName.replace(/Slice$/i, "")}',
  initialState: {},
  reducers: {},
});
export default ${sliceFileName}.reducer;
`,
                            },
                        };
                    }
                }
            }
        }
    }

    return frontendTree;
}

// ==========================================================
// Clean Terminal Output
// ==========================================================

function cleanTerminalOutput(output) {
    if (!output) return "";
    return output
        .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ==========================================================
// Detect Development Command
// ==========================================================

function detectDevCommand(packageJson) {
    if (!packageJson) throw new Error("package.json is empty.");

    const scripts = packageJson.scripts || {};
    const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
    };

    if (typeof scripts.dev === "string" && scripts.dev.trim()) {
        return {
            command: "npm",
            args: ["run", "dev", "--", "--host", "0.0.0.0"],
            env: { HOST: "0.0.0.0" },
            description: "npm run dev",
        };
    }

    if (typeof scripts.start === "string" && scripts.start.trim()) {
        return {
            command: "npm",
            args: ["run", "start"],
            env: {
                HOST: "0.0.0.0",
                BROWSER: "none",
                CI: "true",
            },
            description: "npm start",
        };
    }

    if (dependencies.vite || dependencies["@vitejs/plugin-react"]) {
        return {
            command: "npx",
            args: ["vite", "--host", "0.0.0.0"],
            env: { HOST: "0.0.0.0" },
            description: "npx vite --host 0.0.0.0",
        };
    }

    return {
        command: "npm",
        args: ["start"],
        env: { HOST: "0.0.0.0", BROWSER: "none" },
        description: "npm start",
    };
}

// ==========================================================
// WebPreview Component
// ==========================================================

export default function WebPreview({ threadId }) {
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState("Initializing WebContainer...");
    const [error, setError] = useState("");
    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);

    const webContainerRef = useRef(null);
    const devProcessRef = useRef(null);
    const startPromiseRef = useRef(null);
    const runIdRef = useRef(0);
    const logsEndRef = useRef(null);

    function addLog(message) {
        console.log(`[WebPreview] ${message}`);
        setLogs((prev) => [...prev, message]);
    }

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    async function stopDevProcess() {
        const process = devProcessRef.current;
        if (!process) return;
        try {
            process.kill();
        } catch {
            // Ignore
        }
        devProcessRef.current = null;
    }

    async function startPreview() {
        if (startPromiseRef.current) {
            return startPromiseRef.current;
        }

        const currentRunId = ++runIdRef.current;

        const task = (async () => {
            try {
                setLoading(true);
                setError("");
                setPreviewUrl("");
                setLogs([]);

                // 1. Cross Origin Isolation check
                if (!window.crossOriginIsolated) {
                    throw new Error(
                        "WebContainer requires cross-origin isolation headers (COOP/COEP). window.crossOriginIsolated is false."
                    );
                }

                setStatusText("Booting WebContainer environment...");
                addLog("Booting WebContainer instance...");
                const webContainer = await getWebContainer();

                if (currentRunId !== runIdRef.current) return;
                webContainerRef.current = webContainer;
                addLog("WebContainer is ready.");

                // 2. Fetch project files from API
                setStatusText("Fetching generated project files...");
                addLog("Fetching project files from server...");
                const projectData = await getProjectFiles(threadId);

                if (currentRunId !== runIdRef.current) return;

                // 3. Locate frontend directory
                const rawFrontendDirectory = getFrontendDirectory(projectData);
                addLog("Frontend files received.");

                // 4. Parse & Normalize package.json
                const rawPackageFile = rawFrontendDirectory["package.json"];
                if (!rawPackageFile) {
                    throw new Error("Generated frontend does not contain package.json.");
                }

                let packageJson = parsePackageJson(rawPackageFile);
                packageJson = normalizePackageJson(packageJson, rawFrontendDirectory);

                // 5. Detect development command
                const devCommand = detectDevCommand(packageJson);
                addLog(`Target dev command: ${devCommand.description}`);

                // 6. Prepare and self-heal frontend files
                setStatusText("Configuring build & entry files...");
                addLog("Normalizing and validating frontend files (index.html, vite.config.js)...");
                let frontendDirectory = normalizeWebContainerFileTree(rawFrontendDirectory);
                frontendDirectory = prepareFrontendFiles(frontendDirectory, packageJson);

                frontendDirectory["package.json"] = {
                    file: {
                        contents: JSON.stringify(packageJson, null, 2),
                    },
                };

                // 7. Mount into WebContainer
                await stopDevProcess();
                setStatusText("Mounting project files...");
                addLog("Mounting files into WebContainer...");
                await webContainer.mount(frontendDirectory);

                if (currentRunId !== runIdRef.current) return;

                // 8. Run npm install
                setStatusText("Installing dependencies (npm install)...");
                addLog("Running npm install --legacy-peer-deps...");
                const installProcess = await webContainer.spawn("npm", [
                    "install",
                    "--legacy-peer-deps",
                    "--no-audit",
                    "--no-fund",
                ]);

                const installReader = installProcess.output.getReader();
                let installOutput = "";

                try {
                    while (true) {
                        const { value, done } = await installReader.read();
                        if (done) break;
                        if (!value) continue;
                        installOutput += value;
                        const clean = cleanTerminalOutput(value);
                        if (clean && currentRunId === runIdRef.current) {
                            addLog(clean);
                        }
                    }
                } finally {
                    installReader.releaseLock();
                }

                const installExit = await installProcess.exit;
                if (currentRunId !== runIdRef.current) return;

                if (installExit !== 0) {
                    throw new Error(
                        `npm install failed with exit code ${installExit}.\n\n${installOutput.slice(-3000)}`
                    );
                }

                addLog("Dependencies installed successfully.");

                // 9. Listen for dev server ready
                setStatusText("Starting local development server...");
                addLog(`Starting dev server: ${devCommand.description}...`);

                const serverReadyHandler = (port, url) => {
                    if (currentRunId !== runIdRef.current) return;
                    console.log("[WebPreview] server-ready event fired:", { port, url });
                    addLog(`Development server active on port ${port}.`);
                    setPreviewUrl(url || `http://localhost:${port}`);
                    setLoading(false);
                };

                webContainer.on("server-ready", serverReadyHandler);

                // 10. Spawn development server
                const devProcess = await webContainer.spawn(
                    devCommand.command,
                    devCommand.args,
                    {
                        env: {
                            ...devCommand.env,
                            HOST: "0.0.0.0",
                            BROWSER: "none",
                            CI: "true",
                        },
                    }
                );

                if (currentRunId !== runIdRef.current) {
                    try { devProcess.kill(); } catch {}
                    return;
                }

                devProcessRef.current = devProcess;

                // Read server stream
                const devReader = devProcess.output.getReader();
                (async () => {
                    try {
                        while (true) {
                            const { value, done } = await devReader.read();
                            if (done) break;
                            if (!value) continue;
                            const clean = cleanTerminalOutput(value);
                            if (clean && currentRunId === runIdRef.current) {
                                addLog(clean);
                            }
                        }
                    } catch (e) {
                        console.warn("[WebPreview] Output read error:", e);
                    } finally {
                        try { devReader.releaseLock(); } catch {}
                    }
                })();

                devProcess.exit.then((code) => {
                    if (currentRunId !== runIdRef.current) return;
                    if (code !== 0) {
                        setLoading(false);
                        setError(`Development server stopped with exit code ${code}. Click "View Logs" below to inspect output.`);
                    }
                });

            } catch (err) {
                console.error("[WebPreview] Startup error:", err);
                if (currentRunId === runIdRef.current) {
                    setLoading(false);
                    setError(err?.message || "Failed to start preview.");
                }
            }
        })();

        startPromiseRef.current = task;
        try {
            await task;
        } finally {
            if (startPromiseRef.current === task) {
                startPromiseRef.current = null;
            }
        }
    }

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                await startPreview();
            } catch (e) {
                if (mounted) console.error("[WebPreview] Initial run failed:", e);
            }
        };
        run();

        return () => {
            mounted = false;
            runIdRef.current += 1;
            startPromiseRef.current = null;
            if (webContainerRef.current) {
                try { webContainerRef.current.off("server-ready"); } catch {}
            }
            stopDevProcess();
        };
    }, [threadId]);

    async function handleRetry() {
        if (loading) return;
        try {
            await startPreview();
        } catch (e) {
            console.error("[WebPreview] Retry failed:", e);
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-gray-100">
            {/* ==================================================
                BROWSER TOOLBAR
            ================================================== */}
            <div className="flex items-center justify-between border-b bg-white px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium border border-gray-200">
                        <span
                            className={`h-2 w-2 rounded-full ${
                                loading
                                    ? "bg-amber-400 animate-pulse"
                                    : error
                                    ? "bg-red-500"
                                    : "bg-emerald-500"
                            }`}
                        />
                        <span className="text-gray-700">
                            {loading ? "Starting..." : error ? "Error" : "Live"}
                        </span>
                    </div>

                    {/* Address bar */}
                    <div className="hidden sm:flex items-center rounded-lg bg-gray-100 px-3 py-1 text-xs font-mono text-gray-600 border border-gray-200 max-w-sm truncate">
                        {previewUrl || (loading ? "http://localhost:5173" : "offline")}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Logs */}
                    <button
                        onClick={() => setShowLogs((prev) => !prev)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                            showLogs
                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                        title="Toggle terminal logs"
                    >
                        {showLogs ? "Hide Logs" : "View Logs"}
                    </button>

                    {/* Open in New Tab */}
                    {previewUrl && (
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                            title="Open preview in full browser tab"
                        >
                            ↗ Open Tab
                        </a>
                    )}

                    {/* Reload / Retry */}
                    <button
                        onClick={handleRetry}
                        disabled={loading}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Reload"}
                    </button>
                </div>
            </div>

            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}
            {error && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                                Preview Startup Error
                            </p>
                            <p className="mt-1 text-xs text-red-700 font-mono whitespace-pre-wrap">
                                {error}
                            </p>
                            {error.includes("refresh") && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-2 inline-flex items-center rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition"
                                >
                                    ↻ Refresh Browser Tab (F5)
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowLogs(true)}
                            className="text-xs text-red-700 underline font-medium hover:text-red-900 ml-4"
                        >
                            Inspect Console Logs
                        </button>
                    </div>
                </div>
            )}

            {/* ==================================================
                MAIN PREVIEW OR LOADING VIEW
            ================================================== */}
            <div className="relative min-h-0 flex-1 flex flex-col bg-gray-50">
                {loading && (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
                        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-violet-600" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Preparing Application Preview
                                    </p>
                                    <p className="text-xs text-gray-500">{statusText}</p>
                                </div>
                            </div>

                            {/* Live mini log box */}
                            {logs.length > 0 && (
                                <div className="mt-4 max-h-56 overflow-auto rounded-xl bg-gray-950 p-3.5 font-mono text-xs text-gray-200">
                                    <pre className="whitespace-pre-wrap leading-relaxed">
                                        {logs.slice(-25).join("\n")}
                                    </pre>
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* IFRAME WHEN READY */}
                {!loading && previewUrl && (
                    <div className="h-full w-full min-h-0 flex-1 bg-white">
                        <iframe
                            title="Generated Application Live Preview"
                            src={previewUrl}
                            className="h-full w-full border-0"
                            allow="cross-origin-isolated"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                        />
                    </div>
                )}

                {/* LOGS DRAWER */}
                {showLogs && (
                    <div className="border-t border-gray-800 bg-gray-950 text-gray-200 flex flex-col h-64 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-1.5 text-xs text-gray-400">
                            <span className="font-mono font-medium">Terminal Logs</span>
                            <button
                                onClick={() => setShowLogs(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                            <pre className="whitespace-pre-wrap">{logs.join("\n")}</pre>
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}