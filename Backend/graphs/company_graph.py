from langgraph.graph import StateGraph,START,END

from state.company_state import CompanyState

from agents.ceo import ceo_initialize,ceo_finalize
from agents.research import research_agent
from agents.finance import finance_agent
from agents.marketing import marketing_agent
from agents.coding import coding_agent
from graphs.routes import route_after_ceo,route_after_research,route_after_marketing,route_after_finance,route_after_coding


builder=StateGraph(CompanyState)

builder.add_node('ceo_initialize',ceo_initialize)
builder.add_node('research',research_agent)
builder.add_node('finance',finance_agent)
builder.add_node('marketing',marketing_agent)
builder.add_node('coding',coding_agent)
builder.add_node('ceo_finalize',ceo_finalize)

builder.add_edge(START,'ceo_initialize')
builder.add_conditional_edges(
    "ceo_initialize",
    route_after_ceo
)
builder.add_conditional_edges(
    "research",
    route_after_research
)
builder.add_conditional_edges(
    "marketing",
    route_after_marketing
)
builder.add_conditional_edges(
    "finance",
    route_after_finance
)

builder.add_conditional_edges(
    "coding",
    route_after_coding
)
builder.add_edge('ceo_finalize',END)

