import re
import json
from typing import List, Tuple
from app.config.settings import settings


class SecurityService:
    """
    双防线 SQL 安全校验：
    第一层 — 规则预筛（零延迟）：快速扫描明显的危险关键字
    第二层 — LLM 语义分析（高精度）：由 LLM 判断是否包含表数据修改操作
    """

    DANGEROUS_KEYWORDS = [
        'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
        'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
        'XP_', 'SP_',
    ]

    MODIFY_KEYWORDS_HINT = [
        'INSERT', 'UPDATE', 'DELETE',
    ]

    SENSITIVE_FIELDS = ['password', 'token', 'secret', 'salt', 'api_key']

    def __init__(self):
        self._llm_client = None

    @property
    def llm_client(self):
        if self._llm_client is None:
            from app.infrastructure.llm_client import llm_client
            self._llm_client = llm_client
        return self._llm_client

    def validate_sql(self, sql: str) -> Tuple[bool, str]:
        """
        双防线 SQL 安全校验。

        返回 (is_safe, reason)
        """
        sql_clean = self._remove_comments(sql)
        sql_upper = sql_clean.upper().strip()

        # ========== 第一层：规则预筛（零延迟） ==========
        for keyword in self.DANGEROUS_KEYWORDS:
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, sql_upper):
                return False, f"SQL包含高危关键字: {keyword}"

        # ========== 第二层：LLM 语义分析 ==========
        is_safe, reason = self.llm_client.analyze_sql_safety(sql)
        return is_safe, reason

    def _remove_comments(self, sql: str) -> str:
        sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
        return sql

    def sanitize_sql(self, sql: str, max_limit: int = None) -> str:
        if max_limit is None:
            max_limit = settings.max_results

        sql = sql.strip()

        limit_match = re.search(r'\bLIMIT\s+(\d+)\s*$', sql, re.IGNORECASE)
        if limit_match:
            current_limit = int(limit_match.group(1))
            if current_limit > max_limit:
                sql = re.sub(r'\bLIMIT\s+\d+\s*$', "LIMIT {}".format(max_limit), sql, flags=re.IGNORECASE)
        else:
            sql = "{} LIMIT {}".format(sql, max_limit)

        return sql

    def contains_sensitive_fields(self, sql: str, schema: str) -> bool:
        sql_lower = sql.lower()
        schema_lower = schema.lower()

        for field in self.SENSITIVE_FIELDS:
            if field in sql_lower and field in schema_lower:
                return True

        return False

    def mask_sensitive_results(self, results: List[dict], schema: str) -> List[dict]:
        if not self.contains_sensitive_fields("", schema):
            return results

        masked_results = []
        sensitive_fields = [f for f in self.SENSITIVE_FIELDS if f in schema.lower()]

        for row in results:
            masked_row = row.copy()
            for field in sensitive_fields:
                if field in masked_row:
                    masked_row[field] = "***"
            masked_results.append(masked_row)

        return masked_results


security_service = SecurityService()
