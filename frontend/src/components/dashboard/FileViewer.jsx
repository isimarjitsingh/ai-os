import Editor from "@monaco-editor/react";

function FileViewer({ file }) {
    console.log(file)
    if (!file) {
        
        return (

            <div className="rounded-2xl bg-white p-8 shadow">

                Select a file

            </div>

        );

    }

    return (

        <div className="overflow-hidden rounded-2xl shadow">

            <div className="bg-[#252526] px-5 py-3 text-white">

                📄 {file.name}

            </div>

            <Editor

                height="700px"

                language={file.language}

                value={file.content}

                theme="vs-dark"

                options={{

                    readOnly: true,

                    minimap: {

                        enabled: true

                    },

                    fontSize: 14,

                    automaticLayout: true,

                    scrollBeyondLastLine: false

                }}

            />

        </div>

    );

}

export default FileViewer;