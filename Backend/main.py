from graphs.graph_service import GraphService

service = GraphService()

state = {
    "user_goal": "Build an AI Fitness Startup"
}

result = service.invoke(
    state=state,
    thread_id="test_thread"
)

print(result["final_report"])