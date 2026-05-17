from typing import List, Optional
from app.infrastructure.vector_store import vector_store

class RAGService:
    def __init__(self):
        self.vector_store = vector_store
        self.similar_query_limit = 3
        self.similarity_threshold = 0.7

    def retrieve_similar_queries(
        self,
        question: str,
        data_source_id: Optional[str] = None
    ) -> List[dict]:
        similar_queries = self.vector_store.search_similar_queries(
            question=question,
            data_source_id=data_source_id,
            limit=self.similar_query_limit
        )

        filtered_queries = [
            q for q in similar_queries
            if q.get('similarity_score', 0) >= self.similarity_threshold
        ]

        return filtered_queries

    def build_rag_prompt(
        self,
        base_prompt: str,
        question: str,
        data_source_id: Optional[str] = None
    ) -> str:
        similar_queries = self.retrieve_similar_queries(question, data_source_id)

        if not similar_queries:
            return base_prompt

        context_parts = []
        context_parts.append("参考的历史查询：")
        context_parts.append("")

        for i, query in enumerate(similar_queries, 1):
            context_parts.append(f"示例 {i}：")
            context_parts.append(f"  问题：{query['question']}")
            context_parts.append(f"  SQL：{query['sql']}")
            context_parts.append("")

        context = "\n".join(context_parts)

        rag_prompt = f"""{context}

当前问题：{question}

请参考上面的历史查询模式，生成对应的SQL查询。
"""
        return rag_prompt

    def store_query(
        self,
        query_id: str,
        question: str,
        sql: str,
        data_source_id: str,
        user_id: str
    ) -> None:
        self.vector_store.add_query(
            query_id=query_id,
            question=question,
            sql=sql,
            data_source_id=data_source_id,
            user_id=user_id
        )

    def delete_query(self, query_id: str) -> None:
        self.vector_store.delete_query(query_id)

    def clear_user_history(self, user_id: str) -> None:
        self.vector_store.clear_user_queries(user_id)

rag_service = RAGService()