from langchain_groq import ChatGroq
from config import GROQ_API_KEY

# Groq LLM with free model
llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=GROQ_API_KEY,
    temperature=0
)