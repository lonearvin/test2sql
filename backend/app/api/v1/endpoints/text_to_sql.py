from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.database import User
from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_active_user
from app.schemas.text_to_sql import QueryRequest, QueryResponse, QueryHistoryResponse
from app.services.text_to_sql_service import text_to_sql_service

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
def query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        response = text_to_sql_service.generate_and_execute(request, current_user, db)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

@router.get("/history", response_model=List[QueryHistoryResponse])
def get_history(
    data_source_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    histories = text_to_sql_service.get_history(
        current_user=current_user,
        db=db,
        data_source_id=data_source_id,
        skip=skip,
        limit=limit
    )

    results = []
    for history in histories:
        results.append({
            "id": history.id,
            "data_source_id": history.data_source_id,
            "question": history.question,
            "sql": history.sql,
            "results": [],
            "status": history.status,
            "error_message": history.error_message,
            "created_at": history.created_at
        })

    return results

@router.get("/history/{history_id}", response_model=QueryHistoryResponse)
def get_history_by_id(
    history_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    history = text_to_sql_service.get_history_by_id(history_id, current_user, db)
    if not history:
        raise HTTPException(status_code=404, detail="查询历史不存在")

    return {
        "id": history.id,
        "data_source_id": history.data_source_id,
        "question": history.question,
        "sql": history.sql,
        "results": [],
        "status": history.status,
        "error_message": history.error_message,
        "created_at": history.created_at
    }

@router.delete("/history/{history_id}")
def delete_history(
    history_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    success = text_to_sql_service.delete_history(history_id, current_user, db)
    if not success:
        raise HTTPException(status_code=404, detail="查询历史不存在")
    return {"message": "查询历史删除成功"}

@router.get("/similar")
def get_similar_queries(
    question: str = Query(..., description="当前问题"),
    data_source_id: Optional[str] = Query(None, description="数据源ID"),
    limit: int = Query(5, description="返回数量"),
    current_user: User = Depends(get_current_active_user)
):
    similar_queries = text_to_sql_service.get_similar_queries(
        question=question,
        data_source_id=data_source_id,
        limit=limit
    )
    return {"similar_queries": similar_queries}