from typing import Optional, List, Dict, Any
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from app.config.settings import settings

class LLMClient:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name=settings.llm_model,
            temperature=settings.llm_temperature,
            openai_api_key=settings.llm_api_key,
            openai_api_base=settings.llm_api_base
        )

    def generate_sql(self, prompt: str, schema: str) -> str:
        system_message = SystemMessage(content=f"""
你是一个SQL专家。根据数据库schema和用户的自然语言问题，生成有效的SQL查询。

规则：
1. 只输出SQL查询，不要包含其他内容
2. 使用MySQL/PostgreSQL的正确语法
3. 不要包含任何markdown格式或解释
4. 必要时使用JOIN
5. 适当使用LIMIT子句限制结果

数据库Schema:
{schema}
""")

        human_message = HumanMessage(content=prompt)

        try:
            response = self.llm([system_message, human_message])
            sql = response.content.strip()
            sql = sql.strip('`').strip()
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
        system_message = SystemMessage(content=f"""
你是一个SQL专家。根据数据库schema和用户的自然语言问题，生成有效的SQL查询。

规则：
1. 只输出SQL查询，不要包含其他内容
2. 使用MySQL/PostgreSQL的正确语法
3. 不要包含任何markdown格式或解释
4. 必要时使用JOIN
5. 适当使用LIMIT子句限制结果
6. 如果是多轮对话后续问题，需要结合上下文理解用户意图
7. 如果需要引用之前的查询结果或变量，使用之前的上下文

数据库Schema:
{schema}
""")

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
        else:
            messages.append(HumanMessage(content=question))

        try:
            response = self.llm(messages)
            sql = response.content.strip()
            sql = sql.strip('`').strip()
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

        context_parts = []
        context_parts.append("参考的历史查询：")

        for i, query in enumerate(similar_queries, 1):
            context_parts.append(f"\n示例 {i}：")
            context_parts.append(f"问题：{query['question']}")
            context_parts.append(f"SQL：{query['sql']}")

        context = "\n".join(context_parts)

        system_message = SystemMessage(content=f"""
你是一个SQL专家。根据数据库schema和用户的自然语言问题，生成有效的SQL查询。

规则：
1. 只输出SQL查询，不要包含其他内容
2. 使用MySQL/PostgreSQL的正确语法
3. 不要包含任何markdown格式或解释
4. 必要时使用JOIN
5. 适当使用LIMIT子句限制结果
6. 优先参考相似的历史查询模式

数据库Schema:
{schema}
""")

        human_message = HumanMessage(content=f"""{context}

当前问题：{question}

请参考上面的历史查询模式，生成对应的SQL查询。
""")

        try:
            response = self.llm([system_message, human_message])
            sql = response.content.strip()
            sql = sql.strip('`').strip()
            return sql
        except Exception as e:
            raise ValueError(f"LLM生成SQL失败: {str(e)}")

llm_client = LLMClient()