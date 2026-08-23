from uuid import uuid4
import json
import threading
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from graphs.graph_service import GraphService
from services.workflow_manager import workflow_manager

from database.database import SessionLocal
from database.crud import (
    create_project,
    get_all_projects,
    get_generated_file,
    get_complete_project
)

from pathlib import Path

# ==========================================================
# FastAPI
# ==========================================================

app = FastAPI(
    title="AI Company OS API",
    version="1.0.0"
)

service = GraphService()

# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# Request Model
# ==========================================================

class GenerateRequest(BaseModel):
    user_goal: str


# ==========================================================
# Routes
# ==========================================================

@app.get("/")
def home():

    return {
        "message": "AI Company OS Backend Running 🚀"
    }


# ----------------------------------------------------------
# Generate
# ----------------------------------------------------------

@app.post("/generate")
def generate(request: GenerateRequest):

    thread_id = str(uuid4())

    workflow_manager.create(thread_id)

    db = SessionLocal()

    try:

        create_project(
            db=db,
            thread_id=thread_id,
            startup_idea=request.user_goal
        )

    finally:

        db.close()

    return {

        "success": True,

        "thread_id": thread_id,

        "user_goal": request.user_goal

    }


# ----------------------------------------------------------
# Get All Projects
# ----------------------------------------------------------

@app.get("/projects")
def get_projects():

    db = SessionLocal()

    try:

        projects = get_all_projects(db)

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


# ----------------------------------------------------------
# Get Single Project
# ----------------------------------------------------------

@app.get("/projects/{thread_id}")
def get_single_project(thread_id: str):

    db = SessionLocal()

    try:

        project = get_complete_project(
            db=db,
            thread_id=thread_id
        )

        if project is None:

            return {
                "success": False,
                "message": "Project not found"
            }

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


# ----------------------------------------------------------
# For get The Files
# ----------------------------------------------------------
@app.get("/files/{file_id}")
def get_file(file_id: int):

    db = SessionLocal()

    try:

        file = get_generated_file(db, file_id)

        if file is None:

            return {
                "success": False,
                "message": "File not found"
            }

        path = Path(file.file_path)

        if not path.exists():

            return {
                "success": False,
                "message": "Physical file not found"
            }

        content = path.read_text(encoding="utf-8")

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

                "language": language_map.get(suffix, "plaintext"),

                "content": content

            }

        }

    finally:

        db.close()

# ----------------------------------------------------------
# Stream
# ----------------------------------------------------------

@app.get("/stream/{thread_id}")
async def stream(
    thread_id: str,
    user_goal: str
):

    async def event_generator():

        state = {

            "thread_id": thread_id,

            "user_goal": user_goal

        }

        # ----------------------------------
        # Safe Graph Execution
        # ----------------------------------

        def run_graph():

            try:

                service.execute(
                    state,
                    thread_id
                )

            except Exception as e:

                print("\n========== GRAPH EXECUTION ERROR ==========")
                print(e)
                print("===========================================\n")

                raise

        # ----------------------------------
        # Start Graph
        # ----------------------------------

        graph_thread = threading.Thread(

            target=run_graph,

            daemon=True

        )

        graph_thread.start()

        # ----------------------------------
        # Read Workflow Bus
        # ----------------------------------

        bus = workflow_manager.get_bus(thread_id)

        while True:

            event = bus.get(timeout=0.1)

            print("STREAM EVENT:", event)

            if event is not None:

                yield {
                    "event": "update",
                    "data": json.dumps(event)
                }

            # --------------------------------------------------
            # Workflow status
            # --------------------------------------------------

            session = workflow_manager.get(thread_id)

            if session:

                # ----------------------------------------------
                # Workflow FAILED
                # ----------------------------------------------

                if (
                    session.status == "failed"
                    and bus.queue.empty()
                ):

                    print(
                        f"❌ Workflow failed: {thread_id}"
                    )

                    yield {
                        "event": "failed",
                        "data": json.dumps({
                            "thread_id": thread_id,
                            "status": "failed",
                            "error": session.error,
                        }),
                    }

                    break

                # ----------------------------------------------
                # Workflow COMPLETED
                # ----------------------------------------------

                if (
                    session.status == "completed"
                    and bus.queue.empty()
                ):

                    print(
                        f"✅ Workflow completed: {thread_id}"
                    )

                    yield {
                        "event": "completed",
                        "data": json.dumps({
                            "thread_id": thread_id,
                            "status": "completed",
                        }),
                    }

                    break

            await asyncio.sleep(0.05)

        # ----------------------------------
        # Final Event
        # ----------------------------------

        yield {

            "event": "completed",

            "data": json.dumps({

                "status": "completed"

            })

        }

        # ----------------------------------
        # Cleanup
        # ----------------------------------

        workflow_manager.remove(thread_id)

    return EventSourceResponse(event_generator())