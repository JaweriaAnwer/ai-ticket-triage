from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tickets, analytics, integrations, clusters

app = FastAPI(title="Nova API", description="AI-Powered Engineering Triage", version="1.0.0")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(analytics.router)
app.include_router(integrations.router)
app.include_router(clusters.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Nova API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "nova-api"}
