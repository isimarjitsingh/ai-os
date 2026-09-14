# AI Company OS - backend
#
# Python 3.10 to match the .venv this project actually runs in
# (Backend/.venv is 3.10.11). requirements.txt was frozen against it, and the
# pins are exact, so building on a newer minor version risks packages that have
# no wheel for that version or that resolve differently at runtime.
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONIOENCODING=utf-8 \
    PYTHONUTF8=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies before copying source so the layer is reused on every
# code change instead of rebuilding the whole environment.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The app resolves generated projects against this directory, and the non-root
# user needs to be able to write to it.
RUN mkdir -p generated_projects \
 && useradd --create-home --shell /usr/sbin/nologin appuser \
 && chown -R appuser:appuser /app

USER appuser

# Render injects PORT; Railway uses the PORT env var too. A literal 8000 here
# would bind the wrong port and the platform would report a health-check failure
# against an app that is actually running fine.
EXPOSE 8000

# Exactly one worker. services/workflow_manager.py holds every in-flight
# workflow in a plain dict and /generate drives it from a thread in this process
# that the SSE endpoint then polls; a second worker would answer the stream from
# a process that never saw the run start.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
