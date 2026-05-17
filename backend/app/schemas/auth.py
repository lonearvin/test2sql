from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True