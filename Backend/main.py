from langgraph.checkpoint.redis import RedisSaver

from graphs.company_graph import graph  # <-- import graph, not company_graph

REDIS_URL = "redis://localhost:6379"

state = {
    "user_goal": "Build an AI Fitness Startup"
}

config = {
    "configurable": {
        "thread_id": "test_thread"
    }
}

with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:

    # Run this only the first time
    checkpointer.setup()

    company_graph = graph.compile(
        checkpointer=checkpointer
    )

    result = company_graph.invoke(
        state,
        config=config
    )

    print(result["final_report"])