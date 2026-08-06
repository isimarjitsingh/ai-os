from dataclasses import dataclass, field
from datetime import datetime

from services.workflow_bus import WorkflowBus


@dataclass
class WorkflowSession:

    thread_id: str

    bus: WorkflowBus = field(default_factory=WorkflowBus)

    status: str = "running"

    created_at: datetime = field(default_factory=datetime.utcnow)


class WorkflowManager:

    def __init__(self):

        self.sessions = {}

    # ----------------------------------
    # Create Workflow Session
    # ----------------------------------

    def create(self, thread_id: str):

        session = WorkflowSession(
            thread_id=thread_id
        )

        self.sessions[thread_id] = session

        return session

    # ----------------------------------
    # Get Session
    # ----------------------------------

    def get(self, thread_id: str):

        return self.sessions.get(thread_id)

    # ----------------------------------
    # Get Bus
    # ----------------------------------

    def get_bus(self, thread_id: str):

        session = self.get(thread_id)

        if session:

            return session.bus

        return None

    # ----------------------------------
    # Finish Workflow
    # ----------------------------------

    def finish(self, thread_id: str):

        session = self.get(thread_id)

        if session:

            session.status = "completed"

    # ----------------------------------
    # Remove Session
    # ----------------------------------

    def remove(self, thread_id: str):

        self.sessions.pop(thread_id, None)


workflow_manager = WorkflowManager()