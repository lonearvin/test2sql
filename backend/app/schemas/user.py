from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

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