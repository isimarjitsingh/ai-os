from pathlib import Path


class FileWriter:

    def __init__(self, output_dir: str = "generated_projects"):
        self.output_dir = Path(output_dir)

    def write_file(
        self,
        project_name: str,
        file_path: str,
        content: str
    ) -> str:

        full_path = self.output_dir / project_name / file_path

        # Create folders automatically
        full_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        # Write the file
        full_path.write_text(
            content,
            encoding="utf-8"
        )

        return str(full_path)


file_writer = FileWriter()