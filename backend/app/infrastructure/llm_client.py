from typing import Optional, List, Dict, Any, Tuple
import re
import json
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from app.config.settings import settings


SQL_SAFETY_ANALYSIS_PROMPT = """你是一个SQL安全分析专家。请分析以下SQL语句，判断它是否包含任何表数据修改操作。

## 修改操作定义（以下任一即为修改操作）
- INSERT: 插入数据
- UPDATE: 更新数据
- DELETE: 删除数据
- DROP: 删除表/视图/数据库
- TRUNCATE: 清空表
- ALTER: 修改表结构
- CREATE: 创建表/视图/数据库
- GRANT / REVOKE: 权限变更
- 存储过程/函数调用 (CALL, EXEC, EXECUTE)
- 任何写操作 (如 SELECT ... INTO, LOAD DATA 等)

## 安全操作（允许执行的）
- SELECT 查询（包括子查询、CTE、窗口函数、聚合等）
- SHOW / DESCRIBE / EXPLAIN 等元数据查询
- 不修改数据的纯读操作

## 输出格式
请只输出一个JSON对象，不要包含任何其他内容：
{"safe": true/false, "reason": "简短说明", "operation_types": ["SELECT"] 或 ["INSERT", "UPDATE"]}

SQL语句:
```sql
{sql}
```"""


SYSTEM_PROMPT_TEMPLATE = """你是一个资深SQL专家，精通MySQL和PostgreSQL。根据提供的数据库schema和用户的自然语言问题，生成精确有效的SQL查询。

## 核心规则
1. 只输出SQL查询语句，不要包含任何其他内容
2. 使用MySQL/PostgreSQL的正确语法
3. 不要包含markdown格式、代码块标记或任何解释
4. 优先使用JOIN而非子查询
5. 适当使用LIMIT子句限制结果
6. **绝对不要生成任何修改数据的SQL。你只能生成SELECT查询。不要生成INSERT/UPDATE/DELETE/DROP/ALTER/CREATE等写操作**
7. **严格仅使用Schema中列出的表和字段，绝对不要编造或假设任何不存在的表、字段或关联关系**
8. 如果Schema中没有足够的表来回答用户问题，直接返回你能做到的最简单的SELECT查询，不要尝试补充不存在的数据

## Schema 解读指南
- 表名和字段名旁的"说明"列展示了字段的业务含义，请仔细参考
- PK = 主键，FK→表.字段 = 外键关系，可利用外键做JOIN
- NOT NULL = 必填字段，不可为空
- 示例数据展示了真实的数据格式和取值范围，可以参考来理解字段含义
- 如果示例数据显示某字段是枚举值(如 status='pending'/'completed')，查询条件应匹配这些值
- 如果说明列或注释为空，请根据字段名和示例数据推断业务含义

## 多轮对话
- 如果是多轮对话后续问题，结合上下文理解用户意图
- 可以引用前文提到的表、字段和条件

## 数据库 Schema
{schema}"""


class LLMClient:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name=settings.llm_model,
            temperature=settings.llm_temperature,
            openai_api_key=settings.llm_api_key,
            openai_api_base=settings.llm_api_base
        )

    def generate_sql(self, prompt: str, schema: str) -> str:
        system_message = SystemMessage(content=SYSTEM_PROMPT_TEMPLATE.format(schema=schema))

        try:
            response = self.llm([system_message, HumanMessage(content=prompt)])
            sql = self._clean_sql(response.content)
            return sql
        except Exception as e:
            raise ValueError(f"LLM生成SQL失败: {str(e)}")

    def generate_sql_with_context(
        self,
        question: str,
        schema: str,
        conversation_history: List[Dict[str, str]] = None,
        similar_queries: List[Dict[str, Any]] = None
    ) -> str:
        system_message = SystemMessage(content=SYSTEM_PROMPT_TEMPLATE.format(schema=schema))

        messages = [system_message]

        if conversation_history:
            for msg in conversation_history:
                if msg['role'] == 'user':
                    messages.append(HumanMessage(content=f"用户: {msg['content']}"))
                elif msg['role'] == 'assistant':
                    messages.append(SystemMessage(content=f"助手: {msg['content']}"))

        if similar_queries and len(similar_queries) > 0:
            context_parts = ["参考的历史查询："]
            for i, query in enumerate(similar_queries, 1):
                context_parts.append(f"\n示例 {i}：")
                context_parts.append(f"问题：{query['question']}")
                context_parts.append(f"SQL：{query['sql']}")
            context = "\n".join(context_parts)
            messages.append(HumanMessage(content=f"{context}\n\n当前问题：{question}"))
        else:
            messages.append(HumanMessage(content=f"当前问题：{question}"))

        if conversation_history:
            messages.append(HumanMessage(content=f"请根据上面的对话上下文，回答当前问题：{question}"))

        try:
            response = self.llm(messages)
            sql = self._clean_sql(response.content)
            return sql
        except Exception as e:
            raise ValueError(f"LLM生成SQL失败: {str(e)}")

    def generate_sql_with_rag(
        self,
        question: str,
        schema: str,
        similar_queries: List[Dict[str, Any]] = None
    ) -> str:
        if not similar_queries:
            return self.generate_sql(question, schema)

        context_parts = ["参考的历史查询："]
        for i, query in enumerate(similar_queries, 1):
            context_parts.append(f"\n示例 {i}：")
            context_parts.append(f"问题：{query['question']}")
            context_parts.append(f"SQL：{query['sql']}")
        context = "\n".join(context_parts)

        human_message = HumanMessage(content=f"{context}\n\n当前问题：{question}\n\n请参考上面的历史查询模式，生成对应的SQL查询。")

        system_message = SystemMessage(content=SYSTEM_PROMPT_TEMPLATE.format(schema=schema))

        try:
            response = self.llm([system_message, human_message])
            sql = self._clean_sql(response.content)
            return sql
        except Exception as e:
            raise ValueError(f"LLM生成SQL失败: {str(e)}")

    def _clean_sql(self, content: str) -> str:
        sql = content.strip()
        sql = sql.strip('`')
        sql = sql.strip()
        if sql.lower().startswith('sql'):
            lines = sql.split('\n', 1)
            if len(lines) > 1:
                sql = lines[1].strip()
        return sql

    def analyze_sql_safety(self, sql: str) -> Tuple[bool, str]:
        try:
            prompt = SQL_SAFETY_ANALYSIS_PROMPT.format(sql=sql)
            response = self.llm([HumanMessage(content=prompt)])
            raw = response.content.strip()

            import json
            result = self._extract_json(raw)
            if result is None:
                return self._fallback_rule_check(sql)

            is_safe = result.get('safe', False)
            reason = result.get('reason', '无法分析')
            return is_safe, reason
        except Exception as e:
            return self._fallback_rule_check(sql)

    def _extract_json(self, raw: str):
        import json
        raw = raw.strip()

        candidates = [raw]

        json_match = re.search(r'\{[^{}]*\}', raw)
        if json_match:
            candidates.insert(0, json_match.group())

        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            extracted = json_match.group()
            if extracted not in candidates:
                candidates.insert(0, extracted)

        for candidate in candidates:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

        return None

    def _fallback_rule_check(self, sql: str) -> Tuple[bool, str]:
        sql_upper = sql.upper()
        modifying_keywords = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'TRUNCATE ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE ']
        for kw in modifying_keywords:
            if kw in sql_upper and not sql_upper.strip().startswith('SELECT'):
                return False, f"检测到修改操作: {kw.strip()}"
            if kw in sql_upper and sql_upper.strip().startswith('SELECT'):
                return True, "LLM分析超时，规则兜底: 语法层面未发现直接修改操作"
        return True, "LLM分析超时，规则兜底: 未检测到修改操作"


llm_client = LLMClient()
