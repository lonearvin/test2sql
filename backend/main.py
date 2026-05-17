import uvicorn
from app.config.settings import settings
from app.api.v1.api import api_router
from app.db.session import create_tables, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Text-to-SQL Service API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    create_tables()
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug
    )