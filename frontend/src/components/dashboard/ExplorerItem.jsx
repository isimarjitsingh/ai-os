import { useState } from "react";

import {
    FaChevronRight,
    FaChevronDown,
    FaFolder,
    FaFolderOpen,
    FaFileCode
} from "react-icons/fa";

function ExplorerItem({

    name,
    node,
    onOpen,
    level = 0

}) {

    const isFile = node.file_path !== undefined;

    const [expanded, setExpanded] = useState(true);

    if (isFile) {

        return (

            <button

                onClick={() => onOpen(node.id)}

                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-slate-100"

                style={{

                    paddingLeft: level * 18

                }}

            >

                <FaFileCode className="text-blue-500" />

                <span>{name}</span>

            </button>

        );

    }

    return (

        <div>

            <button

                onClick={() => setExpanded(!expanded)}

                className="flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-slate-100"

                style={{

                    paddingLeft: level * 18

                }}

            >

                {

                    expanded

                        ? <FaChevronDown size={10}/>

                        : <FaChevronRight size={10}/>

                }

                {

                    expanded

                        ? <FaFolderOpen className="text-yellow-500"/>

                        : <FaFolder className="text-yellow-500"/>

                }

                <span>{name}</span>

            </button>

            {

                expanded &&

                Object.entries(node).map(([childName, childNode]) => (

                    <ExplorerItem

                        key={childName}

                        name={childName}

                        node={childNode}

                        onOpen={onOpen}

                        level={level + 1}

                    />

                ))

            }

        </div>

    );

}

export default ExplorerItem;