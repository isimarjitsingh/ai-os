from langgraph.checkpoint.redis import RedisSaver
from graphs.company_graph import builder


class GraphService:

    def __init__(self):
        self.redis_url = "redis://localhost:6379"

    def invoke(self, state: dict, thread_id: str):

        with RedisSaver.from_conn_string(self.redis_url) as checkpointer:

            # TODO:
            # Move setup() to FastAPI startup event later.
            checkpointer.setup()

            graph = builder.compile(
                checkpointer=checkpointer
            )

            config = {
                "configurable": {
                    "thread_id": thread_id
                }
            }

            return graph.invoke(
                state,
                config=config
            )