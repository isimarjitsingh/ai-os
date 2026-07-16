from langchain_groq import ChatGroq
from config import GROQ_API_KEY

# Use Groq for free Llama access
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY
)