from llm import llm
from prompts.research import RESEARCH_PROMPT
from state.company_state import CompanyState

def research_agent(state:CompanyState):

    prompt=f"""
            {RESEARCH_PROMPT}   
            Business Idea: {state['user_goal']}   
    """   
    
    response=llm.invoke(prompt)

    return{
        'research_report':response.content
    }