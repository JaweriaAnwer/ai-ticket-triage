from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from routers import tickets, analytics, integrations, clusters

app = FastAPI(title="Nova API", description="AI-Powered Engineering Triage", version="1.0.0")

# Configure CORS.
# Locally, this always includes Vite's default dev server (localhost:5173).
# In production, set the FRONTEND_URL env var to your deployed Vercel URL,
# e.g. https://nova-yourname.vercel.app  (no trailing slash).
_allowed_origins = ["http://localhost:5173"]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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
