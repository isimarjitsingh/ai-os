import ast
import operator
from langchain_core.tools import tool

operators = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
}

def evaluate(node):
    if isinstance(node, ast.Constant):
        return node.value

    if isinstance(node, ast.BinOp):
        return operators[type(node.op)](
            evaluate(node.left),
            evaluate(node.right)
        )

    raise ValueError("Unsupported expression")


@tool
def calculator(expression: str) -> str:
    """Safely evaluate a mathematical expression."""

    tree = ast.parse(expression, mode="eval")
    return str(evaluate(tree.body))