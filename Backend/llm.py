from langchain_groq import ChatGroq
from config import GROQ_API_KEY

# Groq LLM with free model
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY
)