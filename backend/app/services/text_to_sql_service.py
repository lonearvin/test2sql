from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.database import DataSource, QueryHistory, User
from app.services.schema_service import schema_service
from app.services.security_service import security_service
from app.infrastructure.llm_client import llm_client
from app.infrastructure.database_connector import database_connector
from app.infrastructure.rag_service import rag_service
from app.schemas.text_to_sql import QueryRequest, QueryResponse
import json

class TextToSQLService:
    def generate_and_execute(self, request: QueryRequest, current_user: User, db: Session) -> QueryResponse:
        data_source = db.query(DataSource).filter(
            DataSource.id == request.data_source_id,
            DataSource.user_id == current_user.id
        ).first()

        if not data_source:
            raise ValueError("数据源不存在或无权访问")

        try:
            schema = schema_service.get_schema(data_source, db)

            similar_queries = rag_service.retrieve_similar_queries(
                question=request.question,
                data_source_id=request.data_source_id
            )

            conversation_history = []
            if request.conversation_history:
                conversation_history = [
                    {"role": msg.role, "content": msg.content}
                    for msg in request.conversation_history
                ]

            sql = llm_client.generate_sql_with_context(
                question=request.question,
                schema=schema,
                conversation_history=conversation_history,
                similar_queries=similar_queries
            )

            is_valid, error_msg = security_service.validate_sql(sql)
            if not is_valid:
                return QueryResponse(
                    id=None,
                    sql=sql,
                    results=[],
                    status="failed",
                    error_message=f"SQL安全校验失败: {error_msg}",
                    conversation_history=request.conversation_history or []
                )

            sql = security_service.sanitize_sql(sql)

            query_history = QueryHistory(
                user_id=current_user.id,
                data_source_id=data_source.id,
                question=request.question,
                sql=sql,
                status="processing"
            )
            db.add(query_history)
            db.commit()

            try:
                results = database_connector.execute_sql(data_source, sql)

                if security_service.contains_sensitive_fields(sql, schema):
                    results = security_service.mask_sensitive_results(results, schema)

                query_history.status = "success"
                query_history.result = json.dumps(results)
                db.commit()

                rag_service.store_query(
                    query_id=query_history.id,
                    question=request.question,
                    sql=sql,
                    data_source_id=request.data_source_id,
                    user_id=current_user.id
                )

                new_conversation_history = (request.conversation_history or []) + [
                    {"role": "user", "content": request.question},
                    {"role": "assistant", "content": f"SQL: {sql}\n结果: {len(results)} 条记录"}
                ]

                return QueryResponse(
                    id=query_history.id,
                    sql=sql,
                    results=results,
                    status="success",
                    error_message=None,
                    conversation_history=new_conversation_history
                )

            except Exception as e:
                query_history.status = "failed"
                query_history.error_message = str(e)
                db.commit()

                new_conversation_history = (request.conversation_history or []) + [
                    {"role": "user", "content": request.question},
                    {"role": "assistant", "content": f"错误: {str(e)}"}
                ]

                return QueryResponse(
                    id=query_history.id,
                    sql=sql,
                    results=[],
                    status="failed",
                    error_message=str(e),
                    conversation_history=new_conversation_history
                )

        except Exception as e:
            return QueryResponse(
                id=None,
                sql=None,
                results=[],
                status="failed",
                error_message=str(e),
                conversation_history=request.conversation_history or []
            )

    def get_history(
        self,
        current_user: User,
        db: Session,
        data_source_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[QueryHistory]:
        query = db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id)

        if data_source_id:
            query = query.filter(QueryHistory.data_source_id == data_source_id)

        return query.order_by(QueryHistory.created_at.desc()).offset(skip).limit(limit).all()

    def get_history_by_id(self, history_id: str, current_user: User, db: Session) -> Optional[QueryHistory]:
        return db.query(QueryHistory).filter(
            QueryHistory.id == history_id,
            QueryHistory.user_id == current_user.id
        ).first()

    def delete_history(self, history_id: str, current_user: User, db: Session) -> bool:
        history = self.get_history_by_id(history_id, current_user, db)
        if not history:
            return False

        rag_service.delete_query(history_id)

        db.delete(history)
        db.commit()
        return True

    def get_similar_queries(
        self,
        question: str,
        data_source_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        return rag_service.retrieve_similar_queries(
            question=question,
            data_source_id=data_source_id
        )

text_to_sql_service = TextToSQLService()