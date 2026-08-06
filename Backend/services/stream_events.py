import json


def format_stream_event(event: dict):

    if not event:
        return None

    agent_name = list(event.keys())[0]

    payload = {

        "agent": agent_name,

        "status": "completed",

        "output": event[agent_name]

    }

    return json.dumps(payload)