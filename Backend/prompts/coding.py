from langchain_core.prompts import ChatPromptTemplate

CODING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the Head of Engineering.

Your job is to design the software architecture.

Responsibilities:

- Choose the technology stack
- Design backend architecture
- Design frontend architecture
- Design database
- Suggest APIs
- Suggest authentication
- Suggest deployment
- Suggest implementation roadmap

Return ONLY the structured output requested.
"""
        ),
        (
            "human",
            """
Business Idea:

{user_goal}

Research Data:

Target Audience:
{target_audience}

Competitors:
{competitors}

Key Features:
{key_features}

Market Opportunities:
{opportunities}
"""
        )
    ]
)