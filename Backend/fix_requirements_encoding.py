"""Convert requirements.txt from UTF-16 (Windows PowerShell default) to UTF-8.

The file was saved as UTF-16 LE with a BOM. pip's own reader sniffs the BOM and
copes, but a Docker build on Linux, CI tooling and simple `open()` calls in
helper scripts all assume UTF-8 and break on the NUL bytes between characters.
"""

from pathlib import Path

REQUIREMENTS = Path(__file__).resolve().parent / "requirements.txt"


def main() -> None:
    raw = REQUIREMENTS.read_bytes()

    if not raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        print("already UTF-8, nothing to do")
        return

    text = raw.decode("utf-16")

    # A UTF-16 file decoded without stripping the BOM leaves \ufeff at the start,
    # which would silently rename the first package on the next read.
    text = text.lstrip("\ufeff")

    lines = [line for line in text.splitlines() if line.strip()]

    REQUIREMENTS.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"rewrote {len(lines)} requirements as UTF-8")
    print("first:", lines[0])
    print("last:", lines[-1])


if __name__ == "__main__":
    main()
