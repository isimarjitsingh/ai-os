from fastapi import APIRouter, Depends

from services.agent_events import emit_running, emit_completed
from agents.tracker import record, get_status, get_all_statuses, get_totals

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("/status")
def agents_status():
    """Return real-time analytics for every agent in the workforce."""
    return {
        "success": True,
        "agents": get_all_statuses(),
        "totals": get_totals(),
    }


@router.post("/{agent_id}/run")
def start_agent(agent_id: str):
    """Simulate an agent run — records start + completion for analytics."""
    record(agent_id, "running")
    record(agent_id, "completed", f"{agent_id} finished its pass")
    return {"success": True, "agent": agent_id, "status": "completed"}