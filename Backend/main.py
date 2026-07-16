from agents.research import research_agent

state = {
    "user_goal": "Launch an AI-powered fitness app"
}

result = research_agent(state)

print(result["research_report"])