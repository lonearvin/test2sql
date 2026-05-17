from typing import List, Dict, Any, Optional, Tuple
import re
import mysql.connector
import psycopg2
from app.models.database import DataSource
import sqlglot


def _sanitize_identifier(name: str) -> str:
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        raise ValueError(f"非法标识符: {name}")
    return name


def _build_table_info_mysql(cursor, table_name: str, database_name: str) -> Tuple[List[Dict], Dict, Dict, str]:
    safe = _sanitize_identifier(table_name)
    safe_db = _sanitize_identifier(database_name)

    cursor.execute(f"SHOW FULL COLUMNS FROM `{safe}`")
    raw_columns = cursor.fetchall()

    cursor.execute(f"""
        SELECT kcu.column_name, tc.constraint_type,
               kcu.referenced_table_name, kcu.referenced_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = '{safe_db}'
          AND tc.table_name = '{safe}'
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
    """)
    constraint_rows = cursor.fetchall()

    cursor.execute(f"""
        SELECT TABLE_COMMENT
        FROM information_schema.tables
        WHERE table_schema = '{safe_db}'
          AND table_name = '{safe}'
    """)
    table_comment_row = cursor.fetchone()
    table_comment = table_comment_row[0] if table_comment_row and table_comment_row[0] else ''

    pk_columns = set()
    fk_map = {}
    for row in constraint_rows:
        col_name, constraint_type, ref_table, ref_col = row
        if constraint_type == 'PRIMARY KEY':
            pk_columns.add(col_name)
        elif constraint_type == 'FOREIGN KEY':
            fk_map[col_name] = f"{ref_table}.{ref_col}" if ref_table else "unknown"

    columns = []
    for col in raw_columns:
        col_name = col[0]
        col_type = col[1]
        is_nullable = (col[3] == 'YES')
        key = col[4]
        default_val = col[5]
        comment = col[8] if len(col) > 8 else ''

        is_pk = col_name in pk_columns or key == 'PRI'
        fk_ref = fk_map.get(col_name)

        columns.append({
            'name': col_name,
            'type': col_type,
            'nullable': is_nullable,
            'is_pk': is_pk,
            'fk_ref': fk_ref,
            'default': str(default_val) if default_val is not None else None,
            'comment': comment or '',
        })

    return columns, pk_columns, fk_map, table_comment


def _build_table_info_pg(cursor, table_name: str, schema_name: str = 'public') -> Tuple[List[Dict], Dict, Dict, str]:
    safe = _sanitize_identifier(table_name)

    cursor.execute(f"""
        SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
               pg_catalog.col_description(
                   (SELECT c.oid FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = '{safe}' AND n.nspname = '{schema_name}'),
                   c.ordinal_position
               ) as col_comment
        FROM information_schema.columns c
        WHERE c.table_name = '{safe}'
          AND c.table_schema = '{schema_name}'
        ORDER BY c.ordinal_position
    """)
    raw_columns = cursor.fetchall()

    cursor.execute(f"""
        SELECT obj_description(pg_class.oid) as table_comment
        FROM pg_catalog.pg_class
        JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_class.relname = '{safe}'
          AND pg_namespace.nspname = '{schema_name}'
    """)
    table_comment_row = cursor.fetchone()
    table_comment = table_comment_row[0] if table_comment_row and table_comment_row[0] else ''

    cursor.execute(f"""
        SELECT kcu.column_name, tc.constraint_type,
               ccu.table_name AS referenced_table_name,
               ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = '{schema_name}'
          AND tc.table_name = '{safe}'
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
    """)
    constraint_rows = cursor.fetchall()

    pk_columns = set()
    fk_map = {}
    for row in constraint_rows:
        col_name, constraint_type, ref_table, ref_col = row
        if constraint_type == 'PRIMARY KEY':
            pk_columns.add(col_name)
        elif constraint_type == 'FOREIGN KEY':
            fk_map[col_name] = f"{ref_table}.{ref_col}" if ref_table else "unknown"

    columns = []
    for col in raw_columns:
        col_name, col_type, is_nullable_str, default_val, col_comment = col
        is_nullable = (is_nullable_str == 'YES')
        is_pk = col_name in pk_columns
        fk_ref = fk_map.get(col_name)

        columns.append({
            'name': col_name,
            'type': col_type,
            'nullable': is_nullable,
            'is_pk': is_pk,
            'fk_ref': fk_ref,
            'default': default_val,
            'comment': col_comment or '',
        })

    return columns, pk_columns, fk_map, table_comment


class DatabaseConnector:
    @staticmethod
    def get_mysql_connection(data_source: DataSource):
        return mysql.connector.connect(
            host=data_source.host,
            port=data_source.port,
            database=data_source.database,
            user=data_source.username,
            password=data_source.password,
            charset='utf8mb4'
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

    def get_rich_schema(self, data_source: DataSource, table_names: List[str]) -> List[Dict[str, Any]]:
        rich_schema = []

        if data_source.type == "mysql":
            connection = self.get_mysql_connection(data_source)
            cursor = connection.cursor()
            db_name = data_source.database

            for table_name in table_names:
                try:
                    columns, pk_columns, fk_map, table_comment = _build_table_info_mysql(cursor, table_name, db_name)
                    rich_schema.append({
                        'table_name': table_name,
                        'table_comment': table_comment,
                        'columns': columns,
                        'pk_columns': list(pk_columns),
                        'fk_map': {k: v for k, v in fk_map.items()},
                    })
                except Exception as e:
                    print(f"WARNING: 跳过表 '{table_name}': {e}")

            cursor.close()
            connection.close()

        elif data_source.type == "postgresql":
            connection = self.get_postgresql_connection(data_source)
            cursor = connection.cursor()

            for table_name in table_names:
                try:
                    columns, pk_columns, fk_map, table_comment = _build_table_info_pg(cursor, table_name)
                    rich_schema.append({
                        'table_name': table_name,
                        'table_comment': table_comment,
                        'columns': columns,
                        'pk_columns': list(pk_columns),
                        'fk_map': {k: v for k, v in fk_map.items()},
                    })
                except Exception as e:
                    print(f"WARNING: 跳过表 '{table_name}': {e}")

            cursor.close()
            connection.close()

        return rich_schema

    def get_schema(self, data_source: DataSource, table_names: List[str]) -> str:
        rich = self.get_rich_schema(data_source, table_names)
        parts = []
        for table in rich:
            cols = []
            for c in table['columns']:
                extra = []
                if c['is_pk']:
                    extra.append('PK')
                if c['fk_ref']:
                    extra.append(f'FK->{c["fk_ref"]}')
                if not c['nullable']:
                    extra.append('NOT NULL')
                if c['default']:
                    extra.append(f'DEFAULT {c["default"]}')
                if c['comment']:
                    extra.append(f'-- {c["comment"]}')

                col_str = f"  {c['name']} {c['type']}"
                if extra:
                    col_str += f"  /* {' | '.join(extra)} */"
                cols.append(col_str)

            create_table_str = "CREATE TABLE {} (\n{});".format(
                table['table_name'],
                ',\n'.join(cols)
            )
            parts.append(create_table_str)

        return "\n\n".join(parts)

    def get_rich_schema_text(
        self,
        data_source: DataSource,
        table_names: List[str],
        table_descriptions: Dict[str, str] = None,
        field_descriptions: Dict[str, Dict[str, str]] = None,
        sample_rows: int = 3
    ) -> str:
        rich = self.get_rich_schema(data_source, table_names)
        if table_descriptions is None:
            table_descriptions = {}
        if field_descriptions is None:
            field_descriptions = {}

        parts = []
        for table in rich:
            tn = table['table_name']
            lines = [f"═══════════════════════════════════════"]
            lines.append(f"表名: {tn}")

            db_table_comment = table.get('table_comment', '')
            table_desc = table_descriptions.get(tn, '')
            if not table_desc and db_table_comment:
                table_desc = db_table_comment
            if table_desc:
                lines.append(f"表说明: {table_desc}")

            if table['pk_columns']:
                lines.append(f"主键: {', '.join(table['pk_columns'])}")
            if table['fk_map']:
                fk_lines = [f"  {col} -> {ref}" for col, ref in table['fk_map'].items()]
                lines.append(f"外键:\n" + '\n'.join(fk_lines))

            lines.append("")
            lines.append(f"{'字段名':<20} {'类型':<20} {'约束':<25} {'说明'}")
            lines.append("-" * 90)

            for c in table['columns']:
                constraints = []
                if c['is_pk']:
                    constraints.append('PK')
                if c['fk_ref']:
                    constraints.append(f'FK→{c["fk_ref"]}')
                if not c['nullable']:
                    constraints.append('NOT NULL')
                if c['default']:
                    constraints.append(f'默认={c["default"]}')

                constraint_str = ', '.join(constraints) if constraints else ''

                desc = field_descriptions.get(tn, {}).get(c['name'], c.get('comment', ''))
                if not desc:
                    desc = ''

                lines.append(f"{c['name']:<20} {c['type']:<20} {constraint_str:<25} {desc}")

            parts.append('\n'.join(lines))

        schema_text = '\n\n'.join(parts)

        sample_text = ""
        if sample_rows > 0:
            sample_parts = []
            for table in rich:
                tn = table['table_name']
                col_names = [c['name'] for c in table['columns']]
                sample_rows_data = self.get_sample_data(data_source, tn, col_names, sample_rows)
                if sample_rows_data:
                    sample_parts.append(f"\n【{tn} 示例数据 ({len(sample_rows_data)}行)】")
                    sample_parts.append("  " + ' | '.join(col_names))
                    sample_parts.append("  " + '-' * 40)
                    for row in sample_rows_data:
                        values = []
                        for col in col_names:
                            val = row.get(col, 'NULL')
                            if isinstance(val, str):
                                if len(val) > 30:
                                    val = val[:27] + '...'
                            values.append(str(val))
                        sample_parts.append("  " + ' | '.join(values))
            if sample_parts:
                sample_text = '\n'.join(sample_parts)

        return schema_text + '\n' + sample_text

    def get_sample_data(
        self,
        data_source: DataSource,
        table_name: str,
        column_names: List[str],
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        safe_name = _sanitize_identifier(table_name)
        safe_columns = ', '.join(f'`{_sanitize_identifier(c)}`' for c in column_names)
        sql = f"SELECT {safe_columns} FROM `{safe_name}` LIMIT {limit}"

        try:
            results = self.execute_sql(data_source, sql, max_results=limit)
            return results
        except Exception:
            return []

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

    def list_all_tables(self, data_source: DataSource) -> List[str]:
        if data_source.type == "mysql":
            connection = self.get_mysql_connection(data_source)
            cursor = connection.cursor()
            cursor.execute("SHOW TABLES")
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            connection.close()
            return tables
        elif data_source.type == "postgresql":
            connection = self.get_postgresql_connection(data_source)
            cursor = connection.cursor()
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            """)
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            connection.close()
            return tables
        return []


database_connector = DatabaseConnector()
