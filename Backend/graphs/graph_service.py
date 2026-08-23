from langgraph.checkpoint.redis import RedisSaver
from graphs.company_graph import builder
from services.workflow_manager import workflow_manager
from database.database import SessionLocal
from database.crud import update_project_status


class GraphService:

    def __init__(self):
        self.redis_url = "redis://localhost:6379"

    def execute(self, state: dict, thread_id: str):

        with RedisSaver.from_conn_string(
            self.redis_url
        ) as checkpointer:

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

                print("\n==============================")
                print("🚀 LANGGRAPH WORKFLOW STARTED")
                print("THREAD:", thread_id)
                print("==============================\n")


                result = graph.invoke(
                    state,
                    config=config
                )


                print("\n==============================")
                print("✅ LANGGRAPH WORKFLOW COMPLETED")
                print("THREAD:", thread_id)
                print("==============================\n")


                # -----------------------------------------
                # DATABASE → COMPLETED
                # -----------------------------------------

                db = SessionLocal()

                try:

                    update_project_status(
                        db=db,
                        thread_id=thread_id,
                        status="completed"
                    )

                finally:

                    db.close()


                workflow_manager.finish(
                    thread_id
                )


                return result


            except Exception as e:

                print("\n==============================")
                print("❌ LANGGRAPH WORKFLOW FAILED")
                print("THREAD:", thread_id)
                print("ERROR:", repr(e))
                print("==============================\n")


                # -----------------------------------------
                # DATABASE → FAILED
                # -----------------------------------------

                db = SessionLocal()

                try:

                    update_project_status(
                        db=db,
                        thread_id=thread_id,
                        status="failed"
                    )

                finally:

                    db.close()


                workflow_manager.fail(
                    thread_id,
                    str(e)
                )


                raise

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