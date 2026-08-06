from services.workflow_manager import workflow_manager


def emit_running(state: dict, agent: str):

    print("STATE KEYS:", state.keys())
    print("THREAD:", state.get("thread_id"))

    bus = workflow_manager.get_bus(state["thread_id"])

    if bus:

        bus.emit(
            agent=agent,
            status="running"
        )


def emit_completed(state: dict, agent: str, output=None):

    print("STATE KEYS:", state.keys())
    print("THREAD:", state.get("thread_id"))
    
    bus = workflow_manager.get_bus(state["thread_id"])

    if bus:

        bus.emit(
            agent=agent,
            status="completed",
            output=output
        )