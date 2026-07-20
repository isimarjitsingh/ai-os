from langchain_core.prompts import ChatPromptTemplate

FINANCE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the Head of Finance of an AI company.

Your responsibility is ONLY to create the financial strategy.

Use the business idea and market research to estimate the financial feasibility.

Return ONLY the structured output requested.
"""
        ),
        (
            "human",
            """
Business Idea:

{user_goal}

Research Data:

Market Overview:
{market_overview}

Target Audience:
{target_audience}

Opportunities:
{opportunities}

Risks:
{risks}
"""
        )
    ]
)