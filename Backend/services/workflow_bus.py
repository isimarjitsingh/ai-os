from queue import Queue, Empty


class WorkflowBus:

    def __init__(self):

        self.queue = Queue()

    def emit(self, agent, status, output=None):

        self.queue.put({

            "agent": agent,

            "status": status,

            "output": output

        })

    def get(self, timeout=0.1):

        try:

            return self.queue.get(timeout=timeout)

        except Empty:

            return None

    def clear(self):

        while not self.queue.empty():

            self.queue.get()