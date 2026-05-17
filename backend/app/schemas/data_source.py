from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DataSourceCreate(BaseModel):
    name: str
    type: str
    host: str
    port: int
    database: str
    username: str
    password: str
    description: Optional[str] = None

class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    description: Optional[str] = None

class DataSourceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: str
    host: str
    port: int
    database: str
    username: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TableInfo(BaseModel):
    table_name: str