from uuid import uuid4
import json
import os
import sys
import threading
import asyncio


# ==========================================================
# STDOUT ENCODING
# ==========================================================

# Logging across the agents and routes is full of emoji markers, and a print in
# a request handler that cannot encode is not a cosmetic problem: it raises
# UnicodeEncodeError out of the handler and the client gets a 500 for a request
# that otherwise succeeded. Python picks stdout's encoding from the locale, so
# this bites whenever output is redirected on Windows (cp1252) or the container
# runs under a C/POSIX locale. Forcing UTF-8 with lossy fallback keeps a log
# line from being able to fail a request.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

from fastapi import (
    FastAPI,
    Depends,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from pydantic import BaseModel

from sse_starlette.sse import EventSourceResponse

from graphs.graph_service import GraphService
from services.workflow_manager import workflow_manager

from database.database import SessionLocal, engine, Base
from database import models

from database.crud import (
    create_project,
    get_all_projects,
    get_generated_file,
    get_complete_project,
)

from auth.dependencies import get_current_user
from routes.auth import router as auth_router
from routes.files import router as files_router
from routes.settings import router as settings_router
from pathlib import Path


# ==========================================================
# DATABASE
# ==========================================================

Base.metadata.create_all(bind=engine)


# ==========================================================
# FASTAPI
# ==========================================================

app = FastAPI(
    title="AI Company OS API",
    version="1.0.0"
)


service = GraphService()


# ==========================================================
# CORS
# ==========================================================

# The literal list below only ever matched the Vite dev server, so a deployed
# frontend on any other origin was blocked by the browser before a single
# request reached the API. Origins now come from the environment;
# allow_credentials is on, so "*" cannot be used as a wildcard here and every
# allowed origin must be spelled out.
def _allowed_origins():
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,

    allow_origins=["https://ai-os-qxzd.vercel.app"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ==========================================================
# WORKFLOW STATE WARNING
# ==========================================================

# services/workflow_manager.py keeps every running workflow in a plain dict and
# /generate drives it from a thread in this same process, which the SSE endpoint
# then polls. A second worker or instance would answer the stream from a process
# that never saw the thread start, and the client would get "Workflow session
# not found". Run with a single worker until the bus moves to Redis.
if os.getenv("WEB_CONCURRENCY", "1").strip() not in ("", "1"):
    print(
        "WARNING: WEB_CONCURRENCY is set above 1. In-memory workflow state is "
        "per-process, so /stream/{thread_id} will intermittently report "
        "\"Workflow session not found\". Use a single worker."
    )


# ==========================================================
# AUTH ROUTER
# ==========================================================

app.include_router(
    auth_router
)

app.include_router(
    files_router
)

app.include_router(
    settings_router
)


# ==========================================================
# REQUEST MODELS
# ==========================================================

class GenerateRequest(BaseModel):

    user_goal: str

    api_key: str | None = None


# ==========================================================
# HOME
# ==========================================================

@app.get("/")
def home():

    return {
        "message": "AI Company OS Backend Running 🚀"
    }


# ==========================================================
# HEALTH CHECK
# ==========================================================

# Render and Railway both decide whether to keep restarting a service based on
# a liveness probe, and a free-tier instance that sleeps needs a cheap endpoint
# to wake against. This deliberately touches the database: an app that imports
# fine but cannot reach Postgres is not healthy.
@app.get("/health")
def health():

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {"status": "ok", "database": "up"}

    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail={"status": "degraded", "database": str(error)}
        )


# ==========================================================
# GENERATE PROJECT
# ==========================================================

@app.post("/generate")
def generate(
    request: GenerateRequest,
    current_user=Depends(get_current_user)
):

    # ------------------------------------------------------
    # CREATE UNIQUE THREAD
    # ------------------------------------------------------

    thread_id = str(uuid4())

    workflow_manager.create(
        thread_id
    )

    db = SessionLocal()

    try:

        # --------------------------------------------------
        # SAVE PROJECT FOR CURRENT USER
        # --------------------------------------------------

        project = create_project(

            db=db,

            thread_id=thread_id,

            startup_idea=request.user_goal,

            user_id=current_user.id,

            api_key=request.api_key,

        )

        return {

            "success": True,

            "thread_id": thread_id,

            "project_id": project.id,

            "user_goal": request.user_goal

        }

    finally:

        db.close()


# ==========================================================
# GET USER PROJECTS
# ==========================================================

@app.get("/projects")
def get_projects(
    current_user=Depends(get_current_user)
):

    db = SessionLocal()

    try:

        projects = get_all_projects(

            db=db,

            user_id=current_user.id

        )

        return [

            {

                "thread_id": project.thread_id,

                "project_name": project.project_name,

                "startup_idea": project.startup_idea,

                "status": project.status,

                "generated_path": project.generated_path,

                "created_at": project.created_at

            }

            for project in projects

        ]

    finally:

        db.close()


# ==========================================================
# GET SINGLE PROJECT
# ==========================================================

@app.get("/projects/{thread_id}")
def get_single_project(

    thread_id: str,

    current_user=Depends(
        get_current_user
    )

):

    db = SessionLocal()

    try:

        # --------------------------------------------------
        # IMPORTANT:
        # Only return project belonging to logged-in user
        # --------------------------------------------------

        project = get_complete_project(

            db=db,

            thread_id=thread_id,

            user_id=current_user.id

        )

        if project is None:

            raise HTTPException(

                status_code=404,

                detail="Project not found"

            )

        return {

            "success": True,

            "project": {

                "thread_id": project.thread_id,

                "project_name": project.project_name,

                "startup_idea": project.startup_idea,

                "status": project.status,

                "generated_path": project.generated_path,

                "created_at": project.created_at

            },

            "research": project.research_report,

            "marketing": project.marketing_report,

            "finance": project.finance_report,

            "coding": project.coding_report,

            "ceo": project.ceo_report,

            "files": project.generated_files

        }

    finally:

        db.close()


# ==========================================================
# GET GENERATED FILE
# ==========================================================

@app.get("/files/{file_id}")
def get_file(

    file_id: int,

    current_user=Depends(
        get_current_user
    )

):

    db = SessionLocal()

    try:

        # --------------------------------------------------
        # GET FILE ONLY IF IT BELONGS TO CURRENT USER
        # --------------------------------------------------

        file = get_generated_file(

            db=db,

            file_id=file_id,

            user_id=current_user.id

        )

        if file is None:

            raise HTTPException(

                status_code=404,

                detail="File not found"

            )


        # --------------------------------------------------
        # PHYSICAL FILE
        # --------------------------------------------------

        path = Path(
            file.file_path
        )

        if not path.exists():

            raise HTTPException(

                status_code=404,

                detail="Physical file not found"

            )


        content = path.read_text(
            encoding="utf-8"
        )


        # --------------------------------------------------
        # LANGUAGE
        # --------------------------------------------------

        suffix = path.suffix.lower()


        language_map = {

            ".js": "javascript",

            ".jsx": "javascript",

            ".ts": "typescript",

            ".tsx": "typescript",

            ".py": "python",

            ".css": "css",

            ".html": "html",

            ".json": "json",

            ".md": "markdown"

        }


        return {

            "success": True,

            "file": {

                "id": file.id,

                "name": path.name,

                "language": language_map.get(

                    suffix,

                    "plaintext"

                ),

                "content": content

            }

        }

    finally:

        db.close()


# ==========================================================
# STREAM WORKFLOW
# ==========================================================

@app.get("/stream/{thread_id}")
async def stream(

    thread_id: str,

    user_goal: str,

    api_key: str | None = None,

    token: str = None,

    current_user=Depends(
        get_current_user
    )

):

    # ======================================================
    # VERIFY PROJECT OWNERSHIP
    # ======================================================

    db = SessionLocal()

    try:

        project = get_complete_project(

            db=db,

            thread_id=thread_id,

            user_id=current_user.id

        )

        if project is None:

            raise HTTPException(

                status_code=404,

                detail="Project not found"

            )

    finally:

        db.close()


    # ======================================================
    # ENSURE WORKFLOW SESSION EXISTS
    # ======================================================

    if not workflow_manager.get(thread_id):
        workflow_manager.create(thread_id)
        print(f"Created workflow session for thread: {thread_id}")

    # ======================================================
    # EVENT GENERATOR
    # ======================================================

    async def event_generator():

        state = {

            "thread_id": thread_id,

            "user_goal": user_goal,

            "user_id": current_user.id,

            "api_key": api_key,

        }


        # ==================================================
        # GRAPH EXECUTION
        # ==================================================

        def run_graph():

            try:

                service.execute(

                    state,

                    thread_id

                )

            except Exception as e:

                print(
                    "\n========== GRAPH EXECUTION ERROR =========="
                )

                print(e)

                print(
                    "===========================================\n"
                )


        # ==================================================
        # START GRAPH
        # ==================================================

        graph_thread = threading.Thread(

            target=run_graph,

            daemon=True

        )

        graph_thread.start()


        # ==================================================
        # WORKFLOW BUS
        # ==================================================

        bus = workflow_manager.get_bus(
            thread_id
        )

        if not bus:
            print(f"ERROR: No workflow bus found for thread {thread_id}")
            yield {
                "event": "error",
                "data": json.dumps({
                    "error": "Workflow session not found"
                })
            }
            return

        print(f"Starting SSE stream for thread: {thread_id}")

        while True:

            event = bus.get(
                timeout=0.1
            )


            if event is not None:

                yield {

                    "event": "update",

                    "data": json.dumps(
                        event
                    )

                }


            # ==================================================
            # WORKFLOW STATUS
            # ==================================================

            session = workflow_manager.get(
                thread_id
            )


            if session:

                # ==============================================
                # FAILED
                # ==============================================

                if (

                    session.status == "failed"

                    and bus.queue.empty()

                ):

                    yield {

                        "event": "failed",

                        "data": json.dumps({

                            "thread_id": thread_id,

                            "status": "failed",

                            "error": session.error

                        })

                    }

                    break


                # ==============================================
                # COMPLETED
                # ==============================================

                if (

                    session.status == "completed"

                    and bus.queue.empty()

                ):

                    yield {

                        "event": "completed",

                        "data": json.dumps({

                            "thread_id": thread_id,

                            "status": "completed"

                        })

                    }

                    break


            await asyncio.sleep(
                0.05
            )


        # ==================================================
        # CLEANUP
        # ==================================================

        workflow_manager.remove(
            thread_id
        )


    return EventSourceResponse(
        event_generator()
    )