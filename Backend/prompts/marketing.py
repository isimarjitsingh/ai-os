from langchain_core.prompts import ChatPromptTemplate

MARKETING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the Head of Marketing.

Your job is to create a marketing strategy.

Use the research information provided.

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

Competitors:
{competitors}

Key Features:
{key_features}
"""
        )
    ]
)