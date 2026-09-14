import os
import httpx
from dotenv import load_dotenv

load_dotenv()

xai = os.getenv("XAI_API_KEY")
groq_var = os.getenv("GROQ_API_KEY")
orvar = os.getenv("BAI_API_KEY")


def probe(label, url, key):
    try:
        r = httpx.get(url, headers={"Authorization": f"Bearer {key}"}, timeout=25)
        ok = r.status_code == 200
        print(f"[{'OK ' if ok else 'ERR'}] {label:<32} {r.status_code}")
        if ok:
            try:
                ids = [m.get("id") for m in r.json().get("data", [])]
                print(f"      {len(ids)} models, e.g. {ids[:6]}")
            except Exception:
                pass
        else:
            print(f"      {r.text[:150]}")
    except Exception as e:
        print(f"[EXC] {label:<32} {type(e).__name__}")


print("Which provider does each key actually belong to?\n")
probe("XAI_API_KEY  -> xAI", "https://api.x.ai/v1/api-key", xai)
probe("XAI_API_KEY  -> GROQ", "https://api.groq.com/openai/v1/models", xai)
probe("GROQ_API_KEY -> GROQ", "https://api.groq.com/openai/v1/models", groq_var)
probe("BAI_API_KEY  -> OpenRouter", "https://openrouter.ai/api/v1/key", orvar)
