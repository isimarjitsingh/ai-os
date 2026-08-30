from langgraph.checkpoint.redis import RedisSaver
from langgraph.checkpoint.memory import MemorySaver
from graphs.company_graph import builder
from services.workflow_manager import workflow_manager
from database.database import SessionLocal
from database.crud import update_project_status


class GraphService:

    def __init__(self):
        self.redis_url = "redis://localhost:6379"

    def get_checkpointer(self):
        """Try to get Redis checkpointer, fallback to MemorySaver"""
        try:
            import redis
            # Try to connect to Redis
            redis_client = redis.from_url(self.redis_url)
            redis_client.ping()
            print("✅ Redis connection successful")
            # Create RedisSaver with the redis client directly
            return RedisSaver(redis_client)
        except Exception as e:
            print(f"⚠️ Redis not available, using MemorySaver: {e}")
            return MemorySaver()

    def execute(self, state: dict, thread_id: str):

        checkpointer = self.get_checkpointer()

        try:
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
                        status="completed",
                        user_id=state["user_id"]
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
                        status="failed",
                        user_id=state["user_id"]
                    )

                finally:

                    db.close()


                workflow_manager.fail(
                    thread_id,
                    str(e)
                )


                raise

        except Exception as e:
            print(f"Graph compilation error: {e}")
            raise

        finally:
            # Clean up checkpointer if needed
            if hasattr(checkpointer, 'close'):
                checkpointer.close()

    def invoke(self, state: dict, thread_id: str):

        checkpointer = self.get_checkpointer()

        try:
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
        except Exception as e:
            print(f"Graph invocation error: {e}")
            raise
        finally:
            if hasattr(checkpointer, 'close'):
                checkpointer.close()