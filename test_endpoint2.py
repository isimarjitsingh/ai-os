import sys
sys.path.insert(0, 'Backend')

# Test the router directly without importing the full app
from routes.agents import router
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)

client = TestClient(app)

# Test GET /agents/status
response = client.get('/agents/status')
print('GET /agents/status:', response.status_code)
data = response.json()
print('success:', data.get('success'))
print('agents count:', len(data.get('agents', [])))
for a in data.get('agents', []):
    print(f'  {a["agent"]}: status={a["status"]}, progress={a["progress"]}%, tasks={a["tasks_completed"]}')
print('totals:', data.get('totals'))

# Test POST /agents/{agent_id}/run
response = client.post('/agents/ceo/run')
print('POST /agents/ceo/run:', response.status_code)
print('Response:', response.json())

# Test GET /agents/status again
response = client.get('/agents/status')
print('GET /agents/status (after run):', response.status_code)
data = response.json()
for a in data.get('agents', []):
    print(f'  {a["agent"]}: status={a["status"]}, progress={a["progress"]}%, tasks={a["tasks_completed"]}')