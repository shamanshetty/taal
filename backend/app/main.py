from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routes import users, transactions, goals, chat, simulator, tax, whatsapp, dashboard

load_dotenv()

app = FastAPI(
    title="TaalAI API",
    description="AI-powered financial coach backend",
    version="1.0.0"
)

# CORS middleware
raw_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
origins = [origin.strip() for origin in raw_origins if origin.strip()]

cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if origins:
    cors_kwargs["allow_origins"] = origins
    cors_kwargs["allow_credentials"] = True
else:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["simulator"])
app.include_router(tax.router, prefix="/api/tax", tags=["tax"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["whatsapp"])

@app.get("/")
async def root():
    return {
        "message": "TaalAI API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
