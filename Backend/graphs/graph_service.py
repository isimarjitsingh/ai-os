from langgraph.checkpoint.redis import RedisSaver
from graphs.company_graph import builder
from services.workflow_manager import workflow_manager

class GraphService:

    def __init__(self):
        self.redis_url = "redis://localhost:6379"

    def execute(self, state: dict, thread_id: str):

        with RedisSaver.from_conn_string(self.redis_url) as checkpointer:

            checkpointer.setup()

            graph = builder.compile(
                checkpointer=checkpointer
            )

            config = {
                "configurable": {
                    "thread_id": thread_id
                }
            }
            try:
                graph.invoke(
                    state,
                    config=config
                )
            
            except Exception:

                workflow_manager.finish(thread_id)

                raise
                        
            finally:
                workflow_manager.finish(thread_id)

    def invoke(self, state: dict, thread_id: str):

        with RedisSaver.from_conn_string(self.redis_url) as checkpointer:

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