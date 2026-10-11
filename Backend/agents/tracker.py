"""Agent execution tracker — persists agent lifecycle events in-memory
so the /agents/status endpoint can return real analytics instead of
dummy static values.

Each agent id maps to a list of execution records.  The tracker is
imported by agent_events.py and read by the agents route.
"""

from datetime import datetime, timedelta
from collections import defaultdict

# {agent_id: [execution_record, ...]}
_AGENT_HISTORY = defaultdict(list)

# {agent_id: "running" | "completed" | "idle" | "offline"}
_AGENT_LATEST_STATUS = {}

# {agent_id: datetime} — when the agent was last seen doing work
_AGENT_LAST_SEEN = {}


def record(agent_id: str, status: str, output: str | None = None):
    """Record an agent lifecycle event."""
    record = {
        "agent": agent_id,
        "status": status,
        "output": output,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _AGENT_HISTORY[agent_id].append(record)
    _AGENT_LATEST_STATUS[agent_id] = status
    _AGENT_LAST_SEEN[agent_id] = datetime.utcnow()


def get_status(agent_id: str) -> dict:
    """Return the latest computed status for a single agent."""
    history = _AGENT_HISTORY.get(agent_id, [])

    if not history:
        return {
            "agent": agent_id,
            "status": "offline",
            "progress": 0,
            "tasks_completed": 0,
            "avg_runtime_seconds": 0,
            "success_rate": 0,
            "last_seen": None,
            "total_runs": 0,
        }

    total_runs = len(history)
    completed_runs = sum(1 for r in history if r["status"] == "completed")
    running_runs = sum(1 for r in history if r["status"] == "running")

    # Progress: completed / total, or 100 if currently running
    if running_runs > 0:
        progress = 100
    elif total_runs > 0:
        progress = int((completed_runs / total_runs) * 100)
    else:
        progress = 0

    # Success rate
    success_rate = int((completed_runs / total_runs) * 100) if total_runs > 0 else 0

    # Average runtime (simulated from event timestamps)
    avg_runtime_seconds = _compute_avg_runtime(history)

    latest_status = _AGENT_LATEST_STATUS.get(agent_id, "offline")
    last_seen = _AGENT_LAST_SEEN.get(agent_id)

    # If the agent hasn't been seen for > 5 minutes, mark as idle/offline
    if last_seen:
        seconds_since_seen = (datetime.utcnow() - last_seen).total_seconds()
        if seconds_since_seen > 300 and latest_status != "running":
            display_status = "offline"
        elif latest_status == "running":
            display_status = "active"
        else:
            display_status = "idle"
    else:
        display_status = "offline"

    return {
        "agent": agent_id,
        "status": display_status,
        "progress": progress,
        "tasks_completed": completed_runs,
        "avg_runtime_seconds": avg_runtime_seconds,
        "success_rate": success_rate,
        "last_seen": last_seen.isoformat() if last_seen else None,
        "total_runs": total_runs,
    }


def _compute_avg_runtime(history: list) -> int:
    """Compute average runtime from event timestamps (seconds)."""
    if len(history) < 2:
        return 0

    deltas = []
    for i in range(1, len(history)):
        try:
            prev = datetime.fromisoformat(history[i - 1]["timestamp"])
            curr = datetime.fromisoformat(history[i]["timestamp"])
            delta = (curr - prev).total_seconds()
            if 0 < delta < 3600:  # ignore gaps > 1 hour
                deltas.append(delta)
        except (ValueError, TypeError):
            continue

    if not deltas:
        return 0

    return int(sum(deltas) / len(deltas))


def get_all_statuses() -> list[dict]:
    """Return status for all known agents."""
    AGENT_IDS = ["ceo", "research", "marketing", "finance", "coding", "file_generator"]

    return [get_status(agent_id) for agent_id in AGENT_IDS]


def get_totals() -> dict:
    """Return aggregated totals across all agents."""
    statuses = get_all_statuses()

    total = len(statuses)
    active = sum(1 for s in statuses if s["status"] == "active")
    idle = sum(1 for s in statuses if s["status"] == "idle")
    offline = sum(1 for s in statuses if s["status"] == "offline")

    return {
        "total": total,
        "active": active,
        "idle": idle,
        "offline": offline,
    }