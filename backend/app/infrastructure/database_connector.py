from typing import List, Dict, Any, Optional
import mysql.connector
import psycopg2
from app.models.database import DataSource
import sqlglot

class DatabaseConnector:
    @staticmethod
    def get_mysql_connection(data_source: DataSource):
        return mysql.connector.connect(
            host=data_source.host,
            port=data_source.port,
            database=data_source.database,
            user=data_source.username,
            password=data_source.password
        )

    @staticmethod
    def get_postgresql_connection(data_source: DataSource):
        return psycopg2.connect(
            host=data_source.host,
            port=data_source.port,
            database=data_source.database,
            user=data_source.username,
            password=data_source.password
        )

    def get_connection(self, data_source: DataSource):
        if data_source.type == "mysql":
            return self.get_mysql_connection(data_source)
        elif data_source.type == "postgresql":
            return self.get_postgresql_connection(data_source)
        else:
            raise ValueError(f"不支持的数据库类型: {data_source.type}")

    def get_schema(self, data_source: DataSource, table_names: List[str]) -> str:
        schema_parts = []

        if data_source.type == "mysql":
            connection = self.get_mysql_connection(data_source)
            cursor = connection.cursor()

            for table_name in table_names:
                cursor.execute(f"DESCRIBE {table_name}")
                columns = cursor.fetchall()
                column_defs = []
                for col in columns:
                    col_name = col[0]
                    col_type = col[1]
                    column_defs.append(f"{col_name} {col_type}")
                create_table_str = "CREATE TABLE {} (\n  {});".format(
                    table_name,
                    ',\n  '.join(column_defs)
                )
                schema_parts.append(create_table_str)

            cursor.close()
            connection.close()

        elif data_source.type == "postgresql":
            connection = self.get_postgresql_connection(data_source)
            cursor = connection.cursor()

            for table_name in table_names:
                cursor.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                """)
                columns = cursor.fetchall()
                column_defs = []
                for col in columns:
                    col_name = col[0]
                    col_type = col[1]
                    column_defs.append(f"{col_name} {col_type}")
                create_table_str = "CREATE TABLE {} (\n  {});".format(
                    table_name,
                    ',\n  '.join(column_defs)
                )
                schema_parts.append(create_table_str)

            cursor.close()
            connection.close()

        return "\n\n".join(schema_parts)

    def _convert_types(self, value):
        from decimal import Decimal
        from datetime import datetime, date
        if isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, (datetime, date)):
            return value.isoformat()
        return value

    def execute_sql(self, data_source: DataSource, sql: str, max_results: int = 1000) -> List[Dict[str, Any]]:
        if data_source.type == "mysql":
            connection = self.get_mysql_connection(data_source)
            cursor = connection.cursor(dictionary=True)
            cursor.execute(sql)
            raw_results = cursor.fetchmany(size=max_results)
            cursor.close()
            connection.close()
            results = []
            for row in raw_results:
                converted_row = {k: self._convert_types(v) for k, v in row.items()}
                results.append(converted_row)

        elif data_source.type == "postgresql":
            connection = self.get_postgresql_connection(data_source)
            cursor = connection.cursor()
            cursor.execute(sql)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(size=max_results)
            cursor.close()
            connection.close()
            results = []
            for row in rows:
                converted_row = {columns[i]: self._convert_types(row[i]) for i in range(len(columns))}
                results.append(converted_row)

        else:
            raise ValueError(f"不支持的数据库类型: {data_source.type}")

        return results

    def test_connection(self, data_source: DataSource) -> bool:
        try:
            connection = self.get_connection(data_source)
            connection.close()
            return True
        except Exception:
            return False

database_connector = DatabaseConnector()