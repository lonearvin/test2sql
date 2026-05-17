from typing import List, Optional
from app.models.database import DataSource, SelectedTable
from app.infrastructure.redis_client import redis_client
from app.infrastructure.database_connector import database_connector
from sqlalchemy.orm import Session

class SchemaService:
    SCHEMA_CACHE_TTL = 3600

    def get_schema(self, data_source: DataSource, db: Session, use_cache: bool = True) -> str:
        cache_key = f"schema:{data_source.id}"

        if use_cache:
            cached_schema = redis_client.get(cache_key)
            if cached_schema:
                return cached_schema

        selected_tables = db.query(SelectedTable).filter(
            SelectedTable.data_source_id == data_source.id
        ).all()

        if not selected_tables:
            raise ValueError("该数据源未选择任何数据表")

        table_names = [st.table_name for st in selected_tables]
        schema = database_connector.get_schema(data_source, table_names)

        redis_client.setex(cache_key, self.SCHEMA_CACHE_TTL, schema)

        return schema

    def invalidate_cache(self, data_source_id: str) -> None:
        cache_key = f"schema:{data_source_id}"
        redis_client.delete(cache_key)

schema_service = SchemaService()