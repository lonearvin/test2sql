from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

class ConversationMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    data_source_id: str
    question: str
    conversation_history: Optional[List[ConversationMessage]] = []

class QueryResponse(BaseModel):
    id: Optional[str]
    sql: Optional[str]
    results: List[Dict[str, Any]]
    status: str
    error_message: Optional[str]
    conversation_history: Optional[List[ConversationMessage]] = []

class QueryHistoryResponse(BaseModel):
    id: str
    data_source_id: str
    question: str
    sql: Optional[str]
    results: List[Dict[str, Any]]
    status: str
    error_message: Optional[str]
    created_at: datetime