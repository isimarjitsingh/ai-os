from tools.file_writer import file_writer

file_writer.write_file(
    project_name="TestProject",
    file_path="frontend/src/App.jsx",
    content="export default function App(){return <h1>Hello</h1>}"
)