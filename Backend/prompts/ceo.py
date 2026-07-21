from langchain_core.prompts import ChatPromptTemplate

CEO_FINAL_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the CEO of an AI company.

Your responsibility is to review the outputs from all departments and make executive decisions.

Do not copy the department reports.

Instead:

- Summarize
- Prioritize
- Make business decisions
- Recommend an execution strategy

Return ONLY the structured output requested.
"""
        ),
        (
            "human",
            """
Business Idea:

{user_goal}

Research Output

{research_report}

Marketing Output

{marketing_report}

Finance Output

{finance_report}

Coding Output

{coding_report}
Project Generated Successfully

Project Name:
{generated_project}
"""

        )
    ]
)