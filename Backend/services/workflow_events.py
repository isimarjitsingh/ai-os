import json


class WorkflowEvent:

    @staticmethod
    def started(agent: str):

        return json.dumps({
            "agent": agent,
            "status": "running"
        })

    @staticmethod
    def completed(agent: str, output=None):

        return json.dumps({
            "agent": agent,
            "status": "completed",
            "output": output
        })

    @staticmethod
    def finished():

        return json.dumps({
            "type": "workflow_completed"
        })