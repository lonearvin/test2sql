from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Union

class Settings(BaseSettings):
    app_name: str = "text2sql-service"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True
    
    llm_api_key: str = ""
    llm_api_base: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.1
    
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_use_remote: bool = False
    vector_db_path: str = "./data/vector_db"
    
    admin_db_url: str = "mysql+mysqlconnector://text2sql:text2sql123@localhost:3306/text2sql_admin"
    
    secret_key: str = "your-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    sensitive_fields: str = "password,token,secret,salt"
    max_results: int = 1000
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()