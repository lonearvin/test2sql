from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.models.database import DataSource, SelectedTable, User, TableDescription, FieldDescription, QueryHistory
from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_active_user
from app.schemas.data_source import DataSourceCreate, DataSourceUpdate, DataSourceResponse, TableInfo
from app.schemas.semantic import (
    TableDescriptionCreate, TableDescriptionResponse,
    FieldDescriptionCreate, FieldDescriptionUpdate, FieldDescriptionResponse,
    SemanticImportRequest, SemanticExportItem,
)
from app.services.schema_service import schema_service
from app.infrastructure.database_connector import database_connector

router = APIRouter()

@router.get("/", response_model=List[DataSourceResponse])
def get_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_sources = db.query(DataSource).filter(DataSource.user_id == current_user.id).all()
    return data_sources

@router.get("/{data_source_id}", response_model=DataSourceResponse)
def get_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return data_source

@router.post("/", response_model=DataSourceResponse)
def create_data_source(
    data_source: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    test_ds = DataSource(
        user_id=current_user.id,
        name=data_source.name,
        type=data_source.type,
        host=data_source.host,
        port=data_source.port,
        database=data_source.database,
        username=data_source.username,
        password=data_source.password
    )

    if not database_connector.test_connection(test_ds):
        raise HTTPException(status_code=400, detail="数据库连接失败，请检查配置")

    new_data_source = DataSource(
        user_id=current_user.id,
        name=data_source.name,
        type=data_source.type,
        host=data_source.host,
        port=data_source.port,
        database=data_source.database,
        username=data_source.username,
        password=data_source.password,
        description=data_source.description
    )
    db.add(new_data_source)
    db.commit()
    db.refresh(new_data_source)
    return new_data_source

@router.put("/{data_source_id}", response_model=DataSourceResponse)
def update_data_source(
    data_source_id: str,
    data_source_update: DataSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    existing_data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()

    if not existing_data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    update_data = data_source_update.dict(exclude_unset=True)

    if any(k in update_data for k in ['host', 'port', 'username', 'password']):
        test_ds = DataSource(
            user_id=current_user.id,
            name=existing_data_source.name,
            type=existing_data_source.type,
            host=update_data.get('host', existing_data_source.host),
            port=update_data.get('port', existing_data_source.port),
            database=existing_data_source.database,
            username=update_data.get('username', existing_data_source.username),
            password=update_data.get('password', existing_data_source.password)
        )
        if not database_connector.test_connection(test_ds):
            raise HTTPException(status_code=400, detail="数据库连接失败，请检查配置")

    for key, value in update_data.items():
        setattr(existing_data_source, key, value)

    db.commit()
    db.refresh(existing_data_source)
    return existing_data_source

@router.delete("/{data_source_id}")
def delete_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()

    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    schema_service.invalidate_cache(data_source_id)
    db.query(QueryHistory).filter(QueryHistory.data_source_id == data_source_id).delete()
    db.query(SelectedTable).filter(SelectedTable.data_source_id == data_source_id).delete()
    db.query(FieldDescription).filter(FieldDescription.data_source_id == data_source_id).delete()
    db.query(TableDescription).filter(TableDescription.data_source_id == data_source_id).delete()
    db.delete(data_source)
    db.commit()
    return {"message": "数据源删除成功"}

@router.get("/{data_source_id}/tables", response_model=List[TableInfo])
def get_tables(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()

    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    selected_tables = db.query(SelectedTable).filter(SelectedTable.data_source_id == data_source_id).all()
    table_names = [st.table_name for st in selected_tables]

    if not table_names:
        raise HTTPException(status_code=400, detail="该数据源未选择任何数据表")

    try:
        schema = database_connector.get_schema(data_source, table_names)
        return [TableInfo(table_name=name) for name in table_names]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取表结构失败: {str(e)}")

@router.post("/{data_source_id}/tables")
def select_tables(
    data_source_id: str,
    tables: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()

    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    available_tables = database_connector.list_all_tables(data_source)
    for table_name in tables:
        if table_name not in available_tables:
            raise HTTPException(status_code=400, detail=f"表 '{table_name}' 在数据库中不存在，可用表: {available_tables}")

    schema_service.invalidate_cache(data_source_id)
    db.query(SelectedTable).filter(SelectedTable.data_source_id == data_source_id).delete()

    for table_name in tables:
        selected_table = SelectedTable(data_source_id=data_source_id, table_name=table_name)
        db.add(selected_table)

    db.commit()
    return {"message": f"成功选择 {len(tables)} 个数据表"}

@router.get("/{data_source_id}/selected-tables", response_model=List[TableInfo])
def get_selected_tables(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()

    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    selected_tables = db.query(SelectedTable).filter(SelectedTable.data_source_id == data_source_id).all()
    return [TableInfo(table_name=st.table_name) for st in selected_tables]


def _get_ds(db: Session, data_source_id: str, user: User) -> DataSource:
    ds = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return ds


@router.get("/{data_source_id}/all-tables")
def list_all_tables(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ds = _get_ds(db, data_source_id, current_user)
    try:
        tables = database_connector.list_all_tables(ds)
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取表列表失败: {str(e)}")


# ==================== 语义层 API ====================

@router.get("/{data_source_id}/semantic/tables", response_model=List[TableDescriptionResponse])
def get_table_descriptions(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)
    return db.query(TableDescription).filter(
        TableDescription.data_source_id == data_source_id
    ).all()


@router.post("/{data_source_id}/semantic/tables", response_model=TableDescriptionResponse)
def create_table_description(
    data_source_id: str,
    req: TableDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)

    existing = db.query(TableDescription).filter(
        TableDescription.data_source_id == data_source_id,
        TableDescription.table_name == req.table_name
    ).first()
    if existing:
        existing.description = req.description
        db.commit()
        db.refresh(existing)
        return existing

    desc = TableDescription(
        data_source_id=data_source_id,
        table_name=req.table_name,
        description=req.description
    )
    db.add(desc)
    db.commit()
    db.refresh(desc)
    return desc


@router.delete("/{data_source_id}/semantic/tables/{table_name}")
def delete_table_description(
    data_source_id: str,
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)
    desc = db.query(TableDescription).filter(
        TableDescription.data_source_id == data_source_id,
        TableDescription.table_name == table_name
    ).first()
    if not desc:
        raise HTTPException(status_code=404, detail="表描述不存在")
    db.query(FieldDescription).filter(
        FieldDescription.data_source_id == data_source_id,
        FieldDescription.table_name == table_name
    ).delete()
    db.delete(desc)
    db.commit()
    schema_service.invalidate_cache(data_source_id)
    return {"message": "删除成功"}


@router.get("/{data_source_id}/semantic/fields", response_model=List[FieldDescriptionResponse])
def get_field_descriptions(
    data_source_id: str,
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)
    return db.query(FieldDescription).filter(
        FieldDescription.data_source_id == data_source_id,
        FieldDescription.table_name == table_name
    ).all()


@router.post("/{data_source_id}/semantic/fields", response_model=FieldDescriptionResponse)
def create_field_description(
    data_source_id: str,
    req: FieldDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)

    existing = db.query(FieldDescription).filter(
        FieldDescription.data_source_id == data_source_id,
        FieldDescription.table_name == req.table_name,
        FieldDescription.field_name == req.field_name
    ).first()
    if existing:
        existing.description = req.description
        db.commit()
        db.refresh(existing)
        return existing

    desc = FieldDescription(
        data_source_id=data_source_id,
        table_name=req.table_name,
        field_name=req.field_name,
        description=req.description
    )
    db.add(desc)
    db.commit()
    db.refresh(desc)
    return desc


@router.put("/{data_source_id}/semantic/fields/{field_id}", response_model=FieldDescriptionResponse)
def update_field_description(
    data_source_id: str,
    field_id: str,
    req: FieldDescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)
    desc = db.query(FieldDescription).filter(
        FieldDescription.id == field_id,
        FieldDescription.data_source_id == data_source_id
    ).first()
    if not desc:
        raise HTTPException(status_code=404, detail="字段描述不存在")
    desc.description = req.description
    db.commit()
    db.refresh(desc)
    schema_service.invalidate_cache(data_source_id)
    return desc


@router.delete("/{data_source_id}/semantic/fields/{field_id}")
def delete_field_description(
    data_source_id: str,
    field_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)
    desc = db.query(FieldDescription).filter(
        FieldDescription.id == field_id,
        FieldDescription.data_source_id == data_source_id
    ).first()
    if not desc:
        raise HTTPException(status_code=404, detail="字段描述不存在")
    db.delete(desc)
    db.commit()
    schema_service.invalidate_cache(data_source_id)
    return {"message": "删除成功"}


@router.post("/{data_source_id}/semantic/import")
def import_semantic(
    data_source_id: str,
    req: SemanticImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)

    for item in req.items:
        existing_table = db.query(TableDescription).filter(
            TableDescription.data_source_id == data_source_id,
            TableDescription.table_name == item.table_name
        ).first()
        if existing_table:
            existing_table.description = item.table_description
        else:
            db.add(TableDescription(
                data_source_id=data_source_id,
                table_name=item.table_name,
                description=item.table_description
            ))

        for field in item.fields:
            existing_field = db.query(FieldDescription).filter(
                FieldDescription.data_source_id == data_source_id,
                FieldDescription.table_name == item.table_name,
                FieldDescription.field_name == field.field_name
            ).first()
            if existing_field:
                existing_field.description = field.description
            else:
                db.add(FieldDescription(
                    data_source_id=data_source_id,
                    table_name=item.table_name,
                    field_name=field.field_name,
                    description=field.description
                ))

    db.commit()
    schema_service.invalidate_cache(data_source_id)
    return {"message": "导入成功"}


@router.get("/{data_source_id}/semantic/export", response_model=List[SemanticExportItem])
def export_semantic(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    _get_ds(db, data_source_id, current_user)

    table_descs = db.query(TableDescription).filter(
        TableDescription.data_source_id == data_source_id
    ).all()

    result = []
    for td in table_descs:
        fields = db.query(FieldDescription).filter(
            FieldDescription.data_source_id == data_source_id,
            FieldDescription.table_name == td.table_name
        ).all()
        result.append(SemanticExportItem(
            table_name=td.table_name,
            table_description=td.description,
            fields=[FieldDescriptionResponse.model_validate(f) for f in fields]
        ))
    return result