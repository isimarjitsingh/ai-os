import ExplorerItem from "./ExplorerItem";

function GeneratedFiles({

    files,

    onOpen

}) {

    function buildTree(files) {

        const root = {};

        files.forEach(file => {

            const parts = file.file_path.split("/");

            let current = root;

            parts.forEach((part, index) => {

                if (index === parts.length - 1) {

                    current[part] = file;

                }

                else {

                    current[part] ??= {};

                    current = current[part];

                }

            });

        });

        return root;

    }

    const tree = buildTree(files || []);

    return (

        <div className="rounded-2xl bg-white p-5 shadow">

            <h2 className="mb-4 text-xl font-bold">

                Explorer

            </h2>

            {

                Object.entries(tree).map(([name, node]) => (

                    <ExplorerItem

                        key={name}

                        name={name}

                        node={node}

                        onOpen={onOpen}

                    />

                ))

            }

        </div>

    );

}

export default GeneratedFiles;