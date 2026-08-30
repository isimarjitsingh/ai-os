from uuid import uuid4
import json
import threading
import asyncio

from fastapi import (
    FastAPI,
    Depends,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

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
# AUTH ROUTER
# ==========================================================

app.include_router(
    auth_router
)


# ==========================================================
# REQUEST MODELS
# ==========================================================

class GenerateRequest(BaseModel):

    user_goal: str


# ==========================================================
# HOME
# ==========================================================

@app.get("/")
def home():

    return {
        "message": "AI Company OS Backend Running 🚀"
    }


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

            user_id=current_user.id

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

            "user_id": current_user.id

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