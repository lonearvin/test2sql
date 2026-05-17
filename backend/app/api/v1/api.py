from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, data_sources, text_to_sql

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["data_sources"])
api_router.include_router(text_to_sql.router, prefix="/text-to-sql", tags=["text_to_sql"])