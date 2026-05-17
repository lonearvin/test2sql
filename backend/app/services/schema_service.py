from typing import List, Optional, Dict
from app.models.database import DataSource, SelectedTable, TableDescription, FieldDescription
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

        table_descriptions = self._load_table_descriptions(db, data_source.id)
        field_descriptions = self._load_field_descriptions(db, data_source.id)

        schema = database_connector.get_rich_schema_text(
            data_source=data_source,
            table_names=table_names,
            table_descriptions=table_descriptions,
            field_descriptions=field_descriptions,
            sample_rows=3
        )

        redis_client.setex(cache_key, self.SCHEMA_CACHE_TTL, schema)

        return schema

    def _load_table_descriptions(self, db: Session, data_source_id: str) -> Dict[str, str]:
        descs = db.query(TableDescription).filter(
            TableDescription.data_source_id == data_source_id
        ).all()
        return {d.table_name: d.description for d in descs if d.description}

    def _load_field_descriptions(self, db: Session, data_source_id: str) -> Dict[str, Dict[str, str]]:
        descs = db.query(FieldDescription).filter(
            FieldDescription.data_source_id == data_source_id
        ).all()
        result: Dict[str, Dict[str, str]] = {}
        for d in descs:
            if d.description:
                result.setdefault(d.table_name, {})[d.field_name] = d.description
        return result

    def invalidate_cache(self, data_source_id: str) -> None:
        cache_key = f"schema:{data_source_id}"
        redis_client.delete(cache_key)


schema_service = SchemaService()
