from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class TableDescriptionCreate(BaseModel):
    table_name: str
    description: str = ''


class TableDescriptionResponse(BaseModel):
    id: str
    data_source_id: str
    table_name: str
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FieldDescriptionCreate(BaseModel):
    table_name: str
    field_name: str
    description: str = ''


class FieldDescriptionUpdate(BaseModel):
    description: str = ''


class FieldDescriptionResponse(BaseModel):
    id: str
    data_source_id: str
    table_name: str
    field_name: str
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SemanticImportItem(BaseModel):
    table_name: str
    table_description: str = ''
    fields: List[FieldDescriptionCreate] = []


class SemanticImportRequest(BaseModel):
    items: List[SemanticImportItem]


class SemanticExportItem(BaseModel):
    table_name: str
    table_description: str
    fields: List[FieldDescriptionResponse]
