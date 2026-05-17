# Text-to-SQL 后端架构文档

> 本文档详细描述 Text-to-SQL 智能问数系统的后端架构、核心原理、模块设计及数据流转。

---

## 目录

1. [项目概览与系统定位](#一项目概览与系统定位)
2. [整体架构图](#二整体架构图)
3. [分层设计详解](#三分层设计详解)
4. [核心查询流程](#四核心查询流程)
5. [Schema 智能解析系统](#五schema-智能解析系统)
6. [安全体系](#六安全体系)
7. [RAG 检索增强生成](#七rag-检索增强生成)
8. [数据模型与存储](#八数据模型与存储)
9. [API 接口与调用时序](#九api-接口与调用时序)
10. [部署架构](#十部署架构)

---

## 一、项目概览与系统定位

### 1.1 系统定义

Text-to-SQL 是一个**智能问数系统**，核心能力是：用户用自然语言提出问题（如"上个月销售额最高的5个产品是什么？"），系统自动理解数据库结构，生成正确的 SQL 并执行，返回结构化查询结果。

### 1.2 核心能力矩阵

| 能力 | 说明 |
|------|------|
| **自然语言 → SQL** | 将中文/英文问题转化为 MySQL/PostgreSQL 查询 |
| **Schema 智能解析** | 自动提取 COMMENT / 主键 / 外键 / 样本数据，理解表和字段含义 |
| **RAG 检索增强** | 历史成功查询的向量检索，增强 LLM 生成准确性 |
| **多轮对话** | 支持上下文连续问答，理解代词和省略 |
| **多层安全** | SQL 关键词检测 + 结果 LIMIT + 敏感字段脱敏 + 用户数据隔离 |
| **语义层** | 用户可为表和字段添加中文业务说明，覆盖 COMMENT |
| **多数据源** | 支持 MySQL 和 PostgreSQL，按用户隔离管理 |

### 1.3 技术选型

| 层次 | 技术 | 作用 |
|------|------|------|
| Web 框架 | FastAPI + Uvicorn | 异步 HTTP 服务，自动 OpenAPI 文档 |
| ORM | SQLAlchemy 2.0 | 管理库的对象关系映射 |
| 配置管理 | pydantic-settings | 类型安全的 .env 配置 |
| LLM 集成 | LangChain + OpenAI SDK | 统一的 LLM 调用抽象 |
| 向量数据库 | ChromaDB | 历史查询的向量存储与相似检索 |
| 缓存 | Redis | Schema 缓存（TTL 1 小时）|
| 文本嵌入 | sentence-transformers | 将自然语言问题转为 384 维向量 |
| 认证 | python-jose (JWT) | 无状态令牌认证 |
| 数据库驱动 | mysql-connector-python / psycopg2 | 连接用户目标数据库 |

### 1.4 项目文件结构

```
backend/
├── main.py                              # 应用入口
├── requirements.txt                     # Python 依赖
├── Dockerfile                           # 容器镜像
├── .env                                 # 环境变量
│
└── app/
    ├── config/
    │   └── settings.py                  # 所有配置集中管理
    │
    ├── models/
    │   └── database.py                  # 6 个 ORM 模型（SQLAlchemy）
    │
    ├── schemas/                         # Pydantic 请求/响应模型
    │   ├── auth.py                      # 认证相关
    │   ├── user.py                      # 用户相关
    │   ├── data_source.py               # 数据源相关
    │   ├── text_to_sql.py               # 查询相关
    │   └── semantic.py                  # 语义层相关
    │
    ├── db/
    │   └── session.py                   # MySQL 连接池、Session 工厂
    │
    ├── api/v1/
    │   ├── api.py                       # 路由注册中心
    │   └── endpoints/                   # 4 个端点模块
    │       ├── auth.py                  # 注册、登录、JWT 校验
    │       ├── users.py                 # 用户 CRUD
    │       ├── data_sources.py          # 数据源管理 + 语义层 API
    │       └── text_to_sql.py           # 核心查询入口
    │
    ├── services/                        # 业务逻辑层
    │   ├── text_to_sql_service.py       # 查询编排引擎
    │   ├── schema_service.py            # Schema 获取与缓存
    │   └── security_service.py          # SQL 安全校验
    │
    └── infrastructure/                  # 基础设施层
        ├── llm_client.py                # LLM 调用封装
        ├── database_connector.py        # 目标数据库连接器
        ├── redis_client.py              # Redis 客户端
        ├── vector_store.py              # ChromaDB 向量存储
        └── rag_service.py               # RAG 检索服务


---

## 二、整体架构图

### 2.1 全局架构

```
                              ┌──────────────────────────────┐
                              │        Frontend (React)       │
                              │      http://localhost:5173     │
                              └──────────────┬───────────────┘
                                             │ HTTP REST (JSON)
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Application                                  │
│                         http://localhost:8000                                   │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                           Middleware                                       │ │
│  │                    CORS (allow_origins=["*"])                              │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                          /api/v1 Router                                    │ │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐  │ │
│  │  │   /auth   │  │  /users   │  │/data-sources │  │   /text-to-sql     │  │ │
│  │  │  认证鉴权  │  │  用户管理  │  │  数据源管理   │  │   核心查询引擎      │  │ │
│  │  │           │  │           │  │  + 语义层API  │  │                    │  │ │
│  │  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘  └─────────┬──────────┘  │ │
│  └────────┼──────────────┼───────────────┼───────────────────┼──────────────┘ │
└───────────┼──────────────┼───────────────┼───────────────────┼────────────────┘
            │              │               │                   │
            ▼              ▼               ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             Service Layer                                      │
│                                                                                │
│  ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────────────┐ │
│  │   SchemaService    │  │  SecurityService   │  │   TextToSQLService      │ │
│  │  ───────────────── │  │  ───────────────── │  │  ─────────────────────── │ │
│  │  • get_schema()    │  │  • validate_sql()  │  │  • generate_and_execute()│ │
│  │  • Redis 缓存管理   │  │  • sanitize_sql()  │  │  • get_history()        │ │
│  │  • 语义层加载       │  │  • mask_results()  │  │  • delete_history()     │ │
│  │  • 缓存失效         │  │  • 敏感字段检测     │  │  • 多轮对话编排          │ │
│  └─────────┬──────────┘  └─────────┬──────────┘  └────────────┬────────────┘ │
└────────────┼───────────────────────┼──────────────────────────┼──────────────┘
             │                       │                          │
             ▼                       ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Infrastructure Layer                                    │
│                                                                                │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ ┌─────────────────┐  │
│  │  RedisClient  │ │  LLMClient    │ │ DBConnector    │ │  RAGService     │  │
│  │  ──────────── │ │  ──────────── │ │ ────────────── │ │  ──────────────  │  │
│  │  • Schema缓存  │ │  • LangChain  │ │  • MySQL/PG    │ │  • 相似查询检索   │  │
│  │  • JSON存取    │ │  • DeepSeek   │ │  • 连接测试    │ │  • Prompt增强    │  │
│  │  • TTL管理    │ │  • 多轮对话   │ │  • Schema提取  │ │  • 查询存储       │  │
│  └───────┬───────┘ └───────┬───────┘ └───────┬────────┘ └────────┬────────┘  │
│          │                 │                 │                  │            │
│  ┌───────┴─────────────────┴─────────────────┴──────────────────┴────────┐   │
│  │                        VectorStore (ChromaDB)                          │   │
│  │  ─────────────────────────────────────────────────────────────────── │   │
│  │  • Collection: query_history  • Index: HNSW  • Similarity: Cosine     │   │
│  │  • 384维向量 (all-MiniLM-L6-v2)  • 相似度阈值: 0.7                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┬────────────────────────────┘
                                                  │
        ┌──────────────────┬──────────────────────┼──────────────────────┐
        ▼                  ▼                      ▼                      ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ ┌──────────────────┐
│ Docker MySQL  │ │    Redis      │ │    ChromaDB       │ │  External LLM    │
│  ──────────── │ │  ──────────── │ │  ────────────────  │ │  ─────────────── │
│ text2sql_admin│ │  Schema 缓存   │ │  查询向量索引      │ │  DeepSeek API    │
│ (管理数据库)   │ │  TTL = 3600s  │ │  HNSW + Cosine   │ │  OpenAI API      │
│               │ │               │ │                    │ │                  │
│ text2sql_demo │ │               │ │                    │ │                  │
│ (示例业务数据) │ │               │ │                    │ │                  │
└───────────────┘ └───────────────┘ └───────────────────┘ └──────────────────┘
                                        ▲
                                        │
                               ┌──────────────────┐
                               │  sentence-       │
                               │  transformers    │
                               │  (文本向量化)     │
                               └──────────────────┘
```

### 2.2 架构设计原则

| 原则 | 实现方式 |
|------|----------|
| **单向依赖** | API → Service → Infrastructure，下层不依赖上层 |
| **关注点分离** | 路由只做转发，Service 做编排，Infrastructure 做技术实现 |
| **全局单例** | 每个模块导出模块级实例（如 `llm_client`、`schema_service`），避免重复初始化 |
| **配置驱动** | 所有外部依赖通过 `.env` + `pydantic-settings` 配置 |
| **优雅降级** | Redis/ChromaDB 不可用时不影响核心查询（缓存 miss，向量检索返回空） |

---

## 三、分层设计详解

### 3.1 第一层：API 路由层 (`app/api/v1/endpoints/`)

**职责**：接收 HTTP 请求 → 参数校验（Pydantic） → 身份认证（JWT） → 调用 Service → 返回响应。

该层**不包含任何业务逻辑**，只做「转接」。

#### 3.1.1 路由注册机制

[api.py](file:///Users/al/project-main/text_to_sql/backend/app/api/v1/api.py) 是路由注册中心：

```python
api_router = APIRouter()

api_router.include_router(auth.router,        prefix="/auth",         tags=["auth"])
api_router.include_router(users.router,       prefix="/users",        tags=["users"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["data_sources"])
api_router.include_router(text_to_sql.router,  prefix="/text-to-sql",  tags=["text_to_sql"])
```

最终在 [main.py](file:///Users/al/project-main/text_to_sql/backend/main.py#L23) 挂载：

```python
app.include_router(api_router, prefix="/api/v1")
```

完整路径示例：`POST /api/v1/text-to-sql/query`

#### 3.1.2 四个端点模块

**auth.py** —— 认证鉴权
```
POST   /api/v1/auth/register      # 注册新用户
POST   /api/v1/auth/login          # 登录，返回 JWT Token
GET    /api/v1/auth/me             # 获取当前用户信息
```

关键函数：
- `get_password_hash(password)` — SHA256 哈希（salt + password）
- `create_access_token(data, expires)` — JWT 签发（HS256）
- `get_current_user(token)` — 从 Bearer Token 解析用户，作为 FastAPI Depends

**users.py** —— 用户管理（仅 admin 可用）
```
GET    /api/v1/users/               # 用户列表（分页）
GET    /api/v1/users/{id}           # 用户详情
PUT    /api/v1/users/{id}           # 更新用户
DELETE /api/v1/users/{id}           # 删除用户
```

**data_sources.py** —— 数据源管理 + 语义层
```
GET    /api/v1/data-sources/                              # 当前用户的数据源列表
POST   /api/v1/data-sources/                              # 创建数据源（自动测试连接）
GET    /api/v1/data-sources/{id}                          # 数据源详情
PUT    /api/v1/data-sources/{id}                          # 更新数据源
DELETE /api/v1/data-sources/{id}                          # 删除（级联语义层+已选表+缓存）
GET    /api/v1/data-sources/{id}/all-tables               # 浏览数据源所有表
GET    /api/v1/data-sources/{id}/tables                   # 获取已选表的 Schema
POST   /api/v1/data-sources/{id}/tables                   # 选择数据表
GET    /api/v1/data-sources/{id}/selected-tables           # 查看已选表
GET    /api/v1/data-sources/{id}/semantic/tables           # 获取表描述
POST   /api/v1/data-sources/{id}/semantic/tables           # 创建/更新表描述
DELETE /api/v1/data-sources/{id}/semantic/tables/{name}    # 删除表描述
GET    /api/v1/data-sources/{id}/semantic/fields            # 获取字段描述
POST   /api/v1/data-sources/{id}/semantic/fields            # 创建/更新字段描述
PUT    /api/v1/data-sources/{id}/semantic/fields/{fid}      # 更新字段描述
DELETE /api/v1/data-sources/{id}/semantic/fields/{fid}      # 删除字段描述
POST   /api/v1/data-sources/{id}/semantic/import            # 批量导入语义
GET    /api/v1/data-sources/{id}/semantic/export            # 导出语义描述
```

认证方式：每个端点的 `db` 和 `current_user` 通过 FastAPI Depends 注入：
```python
def create_data_source(
    data_source: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
)
```

**text_to_sql.py** —— 核心查询引擎入口
```
POST   /api/v1/text-to-sql/query           # 自然语言 → SQL → 执行
GET    /api/v1/text-to-sql/history          # 查询历史列表
GET    /api/v1/text-to-sql/history/{id}     # 查询历史详情
DELETE /api/v1/text-to-sql/history/{id}     # 删除历史
GET    /api/v1/text-to-sql/similar          # 获取相似查询
```

---

### 3.2 第二层：Service 业务逻辑层 (`app/services/`)

**职责**：核心业务编排，协调多个 Infrastructure 组件完成复杂流程。

该层**不直接操作数据库连接**，通过 Infrastructure 层执行底层操作。

#### 3.2.1 TextToSQLService — 查询编排引擎

文件：[text_to_sql_service.py](file:///Users/al/project-main/text_to_sql/backend/app/services/text_to_sql_service.py)

这是整个系统的**核心编排器**。`generate_and_execute()` 方法串联了完整的 9 步查询流程（详见第四章）。

它持有的依赖：
```python
from app.services.schema_service import schema_service        # Schema 获取
from app.services.security_service import security_service     # SQL 安全
from app.infrastructure.llm_client import llm_client           # LLM 调用
from app.infrastructure.database_connector import database_connector  # SQL 执行
from app.infrastructure.rag_service import rag_service         # RAG 检索
```

#### 3.2.2 SchemaService — Schema 获取与缓存

文件：[schema_service.py](file:///Users/al/project-main/text_to_sql/backend/app/services/schema_service.py)

核心方法 `get_schema()`：

```
1. 检查 Redis 缓存（key=schema:{ds_id}）
   ├── 命中 → 直接返回缓存的 schema 字符串
   └── 未命中 → 继续
2. 从管理库查询 SelectedTable（获取用户选中的表名列表）
3. 从管理库加载用户自定义语义层（TableDescription + FieldDescription）
4. 调用 database_connector.get_rich_schema_text()：
   ├── 连接目标数据库，读取 COMMENT/PK/FK/样本数据
   ├── 融合语义层描述（优先级：用户自定义 > DB COMMENT > 空）
   └── 格式化为结构化的 schema 文本
5. 写入 Redis 缓存（TTL=3600 秒）
6. 返回 schema 文本
```

缓存失效触发条件：
- 用户修改数据表选择（POST/PUT tables）
- 用户修改语义层描述（POST/PUT/DELETE semantic）
- 用户删除数据源（DELETE data-source）

#### 3.2.3 SecurityService — SQL 安全校验

文件：[security_service.py](file:///Users/al/project-main/text_to_sql/backend/app/services/security_service.py)

三个核心方法构成安全防线（详见第六章）：

| 方法 | 功能 | 触发时机 |
|------|------|----------|
| `validate_sql(sql)` | 检查是否为 SELECT + 扫描禁止关键字 | LLM 生成 SQL 后，执行前 |
| `sanitize_sql(sql, max_limit)` | 自动追加 LIMIT 子句 | 校验通过后 |
| `mask_sensitive_results(results, schema)` | 敏感字段值替换为 `***` | 查询结果返回前 |

---

### 3.3 第三层：Infrastructure 基础设施层 (`app/infrastructure/`)

**职责**：底层技术实现，封装与外部系统的所有交互。

该层**不包含业务逻辑**，只提供原子操作。

#### 3.3.1 LLMClient — LLM 调用封装

文件：[llm_client.py](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/llm_client.py)

```
初始化: LangChain ChatOpenAI(model, temperature, api_key, api_base)
         └── 实际指向 DeepSeek API (通过配置切换)

三个 SQL 生成方法:
├── generate_sql(prompt, schema)               # 基础模式
├── generate_sql_with_context(                 # 多轮对话 + RAG
│       question, schema,
│       conversation_history,  # 对话上下文
│       similar_queries)        # RAG 检索结果
└── generate_sql_with_rag(                    # 仅 RAG
        question, schema, similar_queries)
```

System Prompt 设计要点：
- 包含 **Schema 解读指南**：指导 LLM 理解 PK/FK/NOT NULL/COMMENT/示例数据
- 明确要求**只输出 SQL**，不加任何额外内容
- `_clean_sql()` 方法去除 LLM 可能输出的 markdown 标记

#### 3.3.2 DatabaseConnector — 目标数据库连接器

文件：[database_connector.py](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/database_connector.py)

核心能力：

```
连接管理:
├── get_mysql_connection(ds)     # mysql-connector-python
├── get_postgresql_connection(ds) # psycopg2
└── test_connection(ds)          # 连接测试（创建数据源时使用）

Schema 提取（详见第五章）:
├── _build_table_info_mysql(cursor, table, db)
│   ├── SHOW FULL COLUMNS        → 字段 COMMENT
│   ├── information_schema       → PRIMARY KEY / FOREIGN KEY
│   └── information_schema.tables → TABLE_COMMENT
│
├── _build_table_info_pg(cursor, table)
│   ├── information_schema + col_description() → 字段 COMMENT
│   ├── information_schema       → PRIMARY KEY / FOREIGN KEY
│   └── obj_description(pg_class.oid) → 表级 COMMENT
│
├── get_rich_schema(ds, table_names)
│   └── 返回结构化数据: [{table_name, table_comment, columns[], pk_columns, fk_map}]
│
├── get_rich_schema_text(ds, table_names, table_descs, field_descs)
│   └── 格式化为 LLM 可读的文本，融合三层信息
│
└── get_sample_data(ds, table, columns, limit=3)
    └── 每个表取 3 行样本数据

SQL 执行:
├── execute_sql(ds, sql, max_results=1000)
│   ├── MySQL:  cursor(dictionary=True) → fetchmany
│   └── PostgreSQL: cursor.fetchmany → 字典转换
│
└── _convert_types(value)     # Decimal→float, datetime→ISO string

表浏览:
└── list_all_tables(ds)        # SHOW TABLES / information_schema.tables
```

安全措施：`_sanitize_identifier(name)` — 正则校验标识符只包含字母数字下划线，防止 SQL 注入。

#### 3.3.3 RedisClient — Redis 缓存

文件：[redis_client.py](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/redis_client.py)

```
封装操作:
├── get/set/setex/delete/exists     # 字符串操作
└── get_json/set_json               # JSON 序列化存取

使用场景:
└── SchemaService 用 setex(key, 3600, schema) 缓存表结构
```

#### 3.3.4 VectorStore — ChromaDB 向量存储

文件：[vector_store.py](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/vector_store.py)

```
初始化:
├── 连接远程 ChromaDB 服务器 (HTTP API v2)
└── 不可用时优雅降级 → is_available = False

Collection: "query_history"
├── add_query(id, question, sql, ds_id, user_id)
│   ├── 文本 → sentence-transformers (all-MiniLM-L6-v2) → 384维向量
│   └── POST /api/v2/collections/{name}/add
│
├── search_similar_queries(question, ds_id, limit=3)
│   ├── 问题向量化 → ChromaDB query API
│   ├── 过滤: data_source_id 匹配
│   └── 返回: [{id, question, sql, similarity_score: 1-distance}]
│
├── delete_query(id)
└── clear_user_queries(user_id)
```

#### 3.3.5 RAGService — RAG 检索服务

文件：[rag_service.py](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/rag_service.py)

```
retrieve_similar_queries(question, ds_id):
├── 调用 vector_store.search_similar_queries()
└── 过滤: similarity_score >= 0.7 (相似度阈值)

store_query(query_id, question, sql, ds_id, user_id):
└── 调用 vector_store.add_query() 存储到 ChromaDB

delete_query(query_id):
└── 调用 vector_store.delete_query()
```

---

## 四、核心查询流程详解

### 4.1 流程全景

`TextToSQLService.generate_and_execute()` 是系统最核心的方法，串联了完整的 9 步流程。以下是每一步的详细说明：

```
POST /api/v1/text-to-sql/query    ← 用户发起自然语言查询
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TextToSQLService.generate_and_execute()      │
│                                                                  │
│  Step 1: 鉴权验证                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 检查 data_source_id 是否属于 current_user                  │ │
│  │ 不通过 → 抛出 ValueError("数据源不存在或无权访问")           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 2: 获取 Schema                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ schema_service.get_schema(data_source, db)                 │ │
│  │   ├── Redis 缓存命中 → 直接返回 (毫秒级)                    │ │
│  │   └── 缓存未命中:                                           │ │
│  │       ├── 读取选中表列表 (SelectedTable)                     │ │
│  │       ├── 加载用户语义层 (Table/FieldDescription)           │ │
│  │       ├── 连接目标数据库:                                     │ │
│  │       │   ├── 提取字段 COMMENT (SHOW FULL COLUMNS)          │ │
│  │       │   ├── 提取表 COMMENT (information_schema.tables)    │ │
│  │       │   ├── 提取 PK/FK 关系                               │ │
│  │       │   └── 采集样本数据 (每表 3 行)                      │ │
│  │       ├── 三层信息融合 (语义层 > COMMENT > 空白)            │ │
│  │       ├── 格式化输出                                         │ │
│  │       └── 写入 Redis 缓存 (TTL=3600s)                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 3: RAG 检索                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ rag_service.retrieve_similar_queries(question, ds_id)      │ │
│  │   ├── 问题 → sentence-transformers → 384维向量             │ │
│  │   ├── ChromaDB 余弦相似度检索 (HNSW索引)                    │ │
│  │   ├── 过滤: data_source_id 匹配 + similarity >= 0.7        │ │
│  │   └── 返回最多 3 条相似历史查询                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 4: LLM 生成 SQL                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ llm_client.generate_sql_with_context(                      │ │
│  │     question, schema, conversation_history, similar_queries)│ │
│  │                                                            │ │
│  │ 发送给 LLM 的内容:                                          │ │
│  │   System Prompt (含 Schema 解读指南)                        │ │
│  │   + 完整的 Schema 文本 (三层融合后的结构化描述)              │ │
│  │   + 对话历史 (如有)                                         │ │
│  │   + 相似查询参考 (如有)                                     │ │
│  │   + 当前问题                                                │ │
│  │                                                            │ │
│  │ LLM 响应 → _clean_sql() 清理格式 → 纯 SQL 字符串           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 5: SQL 安全校验                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ security_service.validate_sql(sql)                         │ │
│  │   ├── 去除注释 (-- 单行, /* */ 块)                          │ │
│  │   ├── 检查: 首 token 是否为 SELECT                          │ │
│  │   │   不通过 → 返回 status="failed", 不执行                 │ │
│  │   ├── 扫描: 是否含禁止关键字                                │ │
│  │   │   (DROP/DELETE/TRUNCATE/ALTER/CREATE/INSERT/UPDATE...) │ │
│  │   │   不通过 → 返回 status="failed", 不执行                 │ │
│  │   └── 通过 → 继续下一步                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 6: SQL 消毒                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ security_service.sanitize_sql(sql, max_limit=1000)         │ │
│  │   ├── 检查已有 LIMIT 子句 → 上限超出则降为 max_limit       │ │
│  │   └── 无 LIMIT → 自动追加 "LIMIT 1000"                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 7: 执行 SQL                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ database_connector.execute_sql(data_source, sql)           │ │
│  │   ├── MySQL:  cursor(dictionary=True) → fetchmany(1000)    │ │
│  │   │   每行: Decimal→float, datetime→ISO 字符串              │ │
│  │   └── PostgreSQL: cursor.fetchmany(1000) → 字典转换        │ │
│  │       (执行失败 → 捕获异常, 记录到 QueryHistory)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 8: 结果处理                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ security_service.contains_sensitive_fields(sql, schema)    │ │
│  │   └── 是 → mask_sensitive_results(results, schema)         │ │
│  │           敏感字段值 → "***"                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  Step 9: 存储记录                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 管理库写入: QueryHistory (status="success" + result JSON)  │ │
│  │ 向量库写入: rag_service.store_query() → ChromaDB           │ │
│  │ 对话历史追加: user question + assistant response           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                    返回 QueryResponse                            │
│  {                                                               │
│    id, sql, results[], status, error_message,                    │
│    conversation_history[]                                        │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 错误处理策略

系统采用分层错误处理：

```
┌────────────────────────────────────────────────────────┐
│                    错误处理层级                          │
│                                                        │
│  Level 1: 鉴权失败                                     │
│  └→ ValueError → HTTP 400, 不记录 QueryHistory         │
│                                                        │
│  Level 2: Schema获取/LLM生成失败                        │
│  └→ Exception → HTTP 400/500, QueryHistory=None        │
│                                                        │
│  Level 3: SQL 安全校验失败                              │
│  └→ status="failed" + error_message, 不执行 SQL        │
│                                                        │
│  Level 4: SQL 执行失败                                 │
│  └→ status="failed" + 异常信息, 记录到 QueryHistory    │
│     对话历史追加错误信息                                │
│                                                        │
│  Level 5: 执行成功                                     │
│  └→ status="success", 记录结果 + 向量索引               │
└────────────────────────────────────────────────────────┘
```

### 4.3 对话历史管理

系统支持多轮对话，通过 `conversation_history` 字段实现：

```
第一轮:
  Request:  {question: "有多少用户？", history: []}
  Response: {..., history: [
              {role: "user", content: "有多少用户？"},
              {role: "assistant", content: "SQL: SELECT COUNT(*) FROM users\n结果: 1 条记录"}
            ]}

第二轮 (携带第一轮 history):
  Request:  {question: "其中活跃的有多少？", history: [...]}
  ↓ LLM 会结合上文理解 "其中" 指代 "用户"
  ↓ 生成: SELECT COUNT(*) FROM users WHERE is_active = 1
```

### 4.4 完整代码调用链

```
TextToSQLService.generate_and_execute()
│
├── db.query(DataSource)                              [models/database.py]
│
├── schema_service.get_schema(ds, db)                 [services/schema_service.py]
│   ├── redis_client.get(key)                         [infrastructure/redis_client.py]
│   ├── db.query(SelectedTable)                       [models]
│   ├── _load_table_descriptions(db)                  [self]
│   ├── _load_field_descriptions(db)                  [self]
│   └── database_connector.get_rich_schema_text()     [infrastructure/database_connector.py]
│       ├── get_rich_schema(ds, tables)
│       │   ├── _build_table_info_mysql() 或 _build_table_info_pg()
│       │   │   ├── SHOW FULL COLUMNS / information_schema.columns
│       │   │   ├── information_schema.table_constraints → PK/FK
│       │   │   └── information_schema.tables → TABLE_COMMENT
│       │   └── 返回结构化 schema
│       ├── 格式化输出 (融合语义层)
│       └── get_sample_data() × N → SELECT * LIMIT 3
│
├── rag_service.retrieve_similar_queries(q, ds_id)    [infrastructure/rag_service.py]
│   └── vector_store.search_similar_queries()         [infrastructure/vector_store.py]
│       ├── _get_embedding() ← sentence-transformers
│       └── ChromaDB HTTP API query
│
├── llm_client.generate_sql_with_context()            [infrastructure/llm_client.py]
│   ├── 构建 SystemMessage (SYSTEM_PROMPT_TEMPLATE)
│   ├── 拼接 HumanMessage (历史 + RAG + 当前问题)
│   └── self.llm(messages) ← LangChain ChatOpenAI
│
├── security_service.validate_sql(sql)                [services/security_service.py]
│
├── security_service.sanitize_sql(sql)                [services/security_service.py]
│
├── database_connector.execute_sql(ds, sql)            [infrastructure/database_connector.py]
│
├── security_service.mask_sensitive_results()         [services/security_service.py]
│
├── rag_service.store_query()                         [infrastructure/rag_service.py]
│   └── vector_store.add_query() ← ChromaDB
│
└── return QueryResponse
```

---

## 五、Schema 智能解析系统

### 5.1 核心问题

Text-to-SQL 最核心的挑战是：**LLM 如何理解用户数据库中表和字段的业务含义？**

传统做法只拿字段名和类型（如 `status varchar(20)`），LLM 只能靠命名猜测。本系统通过**三层信息叠加**来解决这个问题。

### 5.2 三层信息模型

```
┌──────────────────────────────────────────────────────────────┐
│                     Schema 信息层次                            │
│                                                               │
│  第三层：用户自定义语义层（优先级最高）                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  存储位置：管理库 table_descriptions + field_descriptions  ││
│  │  管理方式：API (CRUD + 导入导出)                           ││
│  │  示例：                                                    ││
│  │    table_descriptions:                                     ││
│  │      orders → "订单主表，记录每笔订单的完整信息"            ││
│  │    field_descriptions:                                     ││
│  │      orders.status → "订单状态: pending/completed/cancelled"││
│  └──────────────────────────────────────────────────────────┘│
│                         ▲ 覆盖优先级最高                        │
│                                                               │
│  第二层：数据库元信息（自动提取）                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  MySQL:                                                    ││
│  │    SHOW FULL COLUMNS FROM table → 字段 COMMENT            ││
│  │    information_schema.tables → TABLE_COMMENT              ││
│  │    information_schema.table_constraints → PK / FK         ││
│  │                                                           ││
│  │  PostgreSQL:                                               ││
│  │    pg_catalog.col_description() → 字段 COMMENT            ││
│  │    obj_description(pg_class.oid) → 表 COMMENT             ││
│  │    information_schema.table_constraints → PK / FK         ││
│  └──────────────────────────────────────────────────────────┘│
│                         ▲ 自动读取                            │
│                                                               │
│  第一层：字段基础信息（数据库内建）                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  DESCRIBE table / information_schema.columns → 字段名+类型 ││
│  │  这是所有数据库都提供的最基础信息                           ││
│  └──────────────────────────────────────────────────────────┘│
│                         ▲ 基础数据                            │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 数据库 COMMENT 自动提取原理

系统在每次查询时（非创建数据源时）实际连接到用户数据库执行以下 SQL：

**MySQL**（以 `orders` 表为例）：

```sql
-- 1. 字段 COMMENT
SHOW FULL COLUMNS FROM `orders`;
-- 返回: Field, Type, Collation, Null, Key, Default, Extra, Privileges, Comment
-- 系统读取: col[0]=字段名, col[1]=类型, col[3]=Null, col[4]=Key, col[5]=Default, col[8]=Comment

-- 2. 主键/外键关系
SELECT kcu.column_name, tc.constraint_type,
       kcu.referenced_table_name, kcu.referenced_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'text2sql_demo'
  AND tc.table_name = 'orders'
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');

-- 3. 表 COMMENT
SELECT TABLE_COMMENT FROM information_schema.tables
WHERE table_schema = 'text2sql_demo' AND table_name = 'orders';
```

**PostgreSQL**：

```sql
-- 1. 字段 COMMENT
SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
       pg_catalog.col_description(
           (SELECT c.oid FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'orders' AND n.nspname = 'public'),
           c.ordinal_position) as col_comment
FROM information_schema.columns c
WHERE c.table_name = 'orders' AND c.table_schema = 'public';

-- 2. 表 COMMENT
SELECT obj_description(pg_class.oid) as table_comment
FROM pg_catalog.pg_class
JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_class.relname = 'orders' AND pg_namespace.nspname = 'public';
```

### 5.4 样本数据采集

每个表取 3 行数据，让 LLM 看到真实的字段值：

```sql
SELECT `id`, `user_id`, `total_amount`, `status`, `created_at`
FROM `orders` LIMIT 3
```

LLM 由此获知：
- 日期格式：`2025-01-15T10:30:00`（ISO 格式）
- 金额范围：`299.99` ~ `599.5`
- 状态枚举值：`completed`, `pending`, `cancelled`
- 关联关系：`user_id = 100` 对应 `users` 表

### 5.5 信息融合优先级

在 [database_connector.py:277](file:///Users/al/project-main/text_to_sql/backend/app/infrastructure/database_connector.py#L277) 的融合逻辑：

```python
desc = field_descriptions.get(tn, {}).get(c['name'],    # 1. 用户自定义
        c.get('comment', ''))                            # 2. DB COMMENT 兜底
```

表级同理：

```python
db_table_comment = table.get('table_comment', '')         # 2. DB COMMENT
table_desc = table_descriptions.get(tn, '')                # 1. 用户自定义
if not table_desc and db_table_comment:
    table_desc = db_table_comment                          # 兜底
```

### 5.6 LLM 收到的最终 Schema 格式

```
═══════════════════════════════════════
表名: orders
表说明: 订单主表，记录每笔订单的完整信息
主键: id
外键:
  user_id -> users.id

字段名                 类型                  约束                       说明
------------------------------------------------------------------------------------------
id                    int                  PK, NOT NULL              订单ID
user_id               int                  NOT NULL, FK→users.id     用户ID
total_amount          decimal(10,2)        NOT NULL                  订单总金额（含税）
status                varchar(20)          默认=pending               订单状态: pending/completed/cancelled
created_at            timestamp            NOT NULL                  创建时间

【orders 示例数据 (3行)】
  id | user_id | total_amount | status | created_at
  ----------------------------------------
  1 | 100 | 299.99 | completed | 2025-01-15T10:30:00
  2 | 101 | 599.5 | pending | 2025-01-16T14:20:00
  3 | 100 | 129.0 | cancelled | 2025-01-17T09:00:00
```

System Prompt 中专门包含 **Schema 解读指南** 指导 LLM 如何利用这些信息：

```
## Schema 解读指南
- 表名和字段名旁的"说明"列展示了字段的业务含义，请仔细参考
- PK = 主键，FK→表.字段 = 外键关系，可利用外键做JOIN
- NOT NULL = 必填字段，不可为空
- 示例数据展示了真实的数据格式和取值范围，可以参考来理解字段含义
- 如果示例数据显示某字段是枚举值，查询条件应匹配这些值
```

---

## 六、安全体系

### 6.1 四层安全防线

```
┌──────────────────────────────────────────────────────────────┐
│                       安全防线                                 │
│                                                               │
│  第一层: 身份认证                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ JWT Token 认证 (所有 API 端点)                             ││
│  │   - 登录 POST /auth/login → 返回 access_token            ││
│  │   - 后续请求 header: Authorization: Bearer <token>       ││
│  │   - 过期时间: 30 分钟 (可配置)                            ││
│  │   - 算法: HS256 + secret_key                             ││
│  └──────────────────────────────────────────────────────────┘│
│                           │                                   │
│  第二层: 数据隔离                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 用户只能访问自己创建的数据源和查询历史                      ││
│  │   - DataSource.user_id == current_user.id                ││
│  │   - QueryHistory.user_id == current_user.id              ││
│  │   - QueryHistory.data_source_id 归属校验                 ││
│  └──────────────────────────────────────────────────────────┘│
│                           │                                   │
│  第三层: SQL 安全校验                                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 禁止非查询操作 + 禁止关键字扫描                             ││
│  │   - 首 token 必须为 SELECT                               ││
│  │   - 禁止: DROP, DELETE, TRUNCATE, ALTER, CREATE,         ││
│  │          INSERT, UPDATE, GRANT, REVOKE, EXEC, XP_*, SP_*  ││
│  │   - 先去除注释再检查 (防止绕过)                            ││
│  └──────────────────────────────────────────────────────────┘│
│                           │                                   │
│  第四层: 结果限制与脱敏                                        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 结果限制:                                                  ││
│  │   - 无 LIMIT → 自动追加 LIMIT 1000 (可配置)               ││
│  │   - 已有 LIMIT → 超出上限则强制降为上限值                  ││
│  │                                                           ││
│  │ 敏感脱敏:                                                  ││
│  │   - 检测字段: password, token, secret, salt, api_key      ││
│  │   - 脱敏后: 字段值 → "***"                                ││
│  │   - 只有 schema 中确实存在敏感字段时才脱敏                 ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 6.2 SQL 关键字检测算法

```python
def validate_sql(self, sql: str) -> Tuple[bool, str]:
    # Step 1: 去除注释（防止 SELECT * FROM t WHERE 1=1; DROP TABLE -- 绕过）
    sql_clean = self._remove_comments(sql)     # 移除 -- 和 /* */
    sql_upper = sql_clean.upper().strip()

    # Step 2: 首 token 检查
    if not sql_upper.startswith('SELECT'):
        return False, "只允许执行SELECT查询"

    # Step 3: 禁止关键字扫描（正则 \b 单词边界匹配）
    for keyword in self.FORBIDDEN_KEYWORDS:
        pattern = r'\b' + keyword + r'\b'
        if re.search(pattern, sql_upper):
            return False, f"SQL包含禁止的关键字: {keyword}"

    return True, ""
```

### 6.3 LIMIT 消毒算法

```python
def sanitize_sql(self, sql: str, max_limit: int = 1000) -> str:
    sql = sql.strip()

    # 检查是否存在 LIMIT n
    limit_match = re.search(r'\bLIMIT\s+(\d+)\s*$', sql, re.IGNORECASE)
    if limit_match:
        current_limit = int(limit_match.group(1))
        if current_limit > max_limit:
            # 超出上限 → 强制降低
            sql = re.sub(r'\bLIMIT\s+\d+\s*$',
                        f"LIMIT {max_limit}", sql, flags=re.IGNORECASE)
    else:
        # 没有 LIMIT → 自动追加
        sql = f"{sql} LIMIT {max_limit}"

    return sql
```

---

## 七、RAG 检索增强生成

### 7.1 RAG 流程总览

RAG（Retrieval-Augmented Generation）是本系统提升 SQL 生成准确率的关键机制。核心思路：**将历史成功查询存储在向量数据库中，新问题到来时检索最相似的历史查询作为 LLM 的参考上下文**。

```
┌──────────────────────────────────────────────────────────────────┐
│                        RAG 完整流程                                │
│                                                                   │
│   ┌──────────┐                                                    │
│   │ 用户问题  │                                                    │
│   └────┬─────┘                                                    │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────────────┐                                         │
│   │ 1. 文本向量化        │  sentence-transformers                  │
│   │ "查询所有订单"       │  (all-MiniLM-L6-v2)                     │
│   │ → [0.12, -0.45,..] │  → 384维浮点向量                        │
│   └────────┬────────────┘                                         │
│            │                                                      │
│            ▼                                                      │
│   ┌─────────────────────────────────────────┐                     │
│   │ 2. ChromaDB 向量相似度检索               │                     │
│   │                                          │                     │
│   │  Collection: query_history               │                     │
│   │  Index: HNSW (分层可导航小世界图)         │                     │
│   │  Metric: Cosine (余弦相似度)             │                     │
│   │  Filter: data_source_id 匹配             │                     │
│   │  n_results: 3                            │                     │
│   └────────────────┬────────────────────────┘                     │
│                    │                                              │
│                    ▼                                              │
│   ┌─────────────────────────────────────────┐                     │
│   │ 3. 相似度过滤                            │                     │
│   │   similarity_score >= 0.7 才采纳         │                     │
│   │   (score = 1 - cosine_distance)          │                     │
│   └────────────────┬────────────────────────┘                     │
│                    │                                              │
│                    ▼                                              │
│   ┌─────────────────────────────────────────┐                     │
│   │ 4. Prompt 增强                           │                     │
│   │                                          │                     │
│   │  参考的历史查询：                         │                     │
│   │                                          │                     │
│   │  示例 1：                                │                     │
│   │    问题：查看所有产品的总销售额           │                     │
│   │    SQL：SELECT SUM(total) FROM orders    │                     │
│   │                                          │                     │
│   │  当前问题：本月销售额是多少？             │                     │
│   │                                          │                     │
│   │  + System Prompt + Schema + 对话历史     │                     │
│   └────────────────┬────────────────────────┘                     │
│                    │                                              │
│                    ▼                                              │
│   ┌──────────┐                                                    │
│   │ 发送 LLM  │ → 生成更准确的 SQL                                 │
│   └──────────┘                                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 向量存储架构

```
ChromaDB Server (http://chromadb:8000)
│
├── Database: text2sql
│   └── Collection: query_history
│       │
│       ├── Index: HNSW (分层可导航小世界图)
│       │   - 近似最近邻搜索
│       │   - O(log N) 查询复杂度
│       │
│       ├── Embedding Function: 外部 (sentence-transformers)
│       │   - 模型: all-MiniLM-L6-v2
│       │   - 维度: 384
│       │   - 语言: 多语言 (支持中英文)
│       │
│       ├── Document 格式:
│       │   "问题: {question}\nSQL: {sql}"
│       │
│       ├── Metadata:
│       │   {
│       │     "question": "原始问题",
│       │     "sql": "生成的SQL",
│       │     "data_source_id": "所属数据源",
│       │     "user_id": "所属用户"
│       │   }
│       │
│       └── Distance: Cosine
│           - 范围: [0, 2] (0=完全相同, 2=完全相反)
│           - 相似度 = 1 - distance
│           - 阈值: >= 0.7
```

### 7.3 相似度阈值设计

| 阈值 | 效果 | 取舍 |
|------|------|------|
| 0.9 | 仅返回几乎相同的问题 | 召回率低，但参考价值极高 |
| 0.7 (当前) | 返回语义相近的问题 | 平衡召回与精度 |
| 0.5 | 返回粗略相关的问题 | 召回率高，但可能引入噪音 |

### 7.4 数据源隔离

RAG 检索时按 `data_source_id` 过滤：

```python
# vector_store.py 中
if data_source_id and metadata.get('data_source_id') != data_source_id:
    continue  # 跳过其他数据源的历史查询
```

这样确保：查询 `数据库A` 的问题时，不会参考 `数据库B`（完全不同结构）的历史查询。

### 7.5 写回机制（持续学习）

每次查询成功后，系统自动将本次查询写入 ChromaDB：

```python
# text_to_sql_service.py
rag_service.store_query(
    query_id=query_history.id,
    question=request.question,
    sql=sql,
    data_source_id=request.data_source_id,
    user_id=current_user.id
)
```

这意味着：**系统使用越多，RAG 效果越好**（良性循环）。

---

## 八、数据模型与存储

### 8.1 存储架构概览

系统使用三种存储，各司其职：

```
                    ┌─────────────────────────────┐
                    │      Text-to-SQL 系统        │
                    └─────────────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│   Docker MySQL  │   │     Redis       │   │    ChromaDB      │
│  (管理数据库)    │   │   (缓存层)       │   │   (向量存储)      │
│                 │   │                 │   │                  │
│ 库: text2sql_   │   │ Key 模式:       │   │ Collection:      │
│     admin       │   │ schema:{ds_id}  │   │ query_history    │
│                 │   │                 │   │                  │
│ 6 张表:         │   │ 用途:           │   │ 用途:            │
│ • users         │   │ Schema 缓存     │   │ 历史查询向量索引  │
│ • data_sources  │   │ (TTL: 3600s)   │   │ 相似度检索        │
│ • selected_     │   │                 │   │                  │
│   tables        │   │                 │   │                  │
│ • query_        │   │                 │   │                  │
│   histories     │   │                 │   │                  │
│ • table_        │   │                 │   │                  │
│   descriptions  │   │                 │   │                  │
│ • field_        │   │                 │   │                  │
│   descriptions  │   │                 │   │                  │
└─────────────────┘   └─────────────────┘   └──────────────────┘
```

### 8.2 ER 模型

```
┌──────────┐          ┌──────────────┐          ┌──────────────────┐
│  users   │ 1──────N │ data_sources │ 1──────N │ selected_tables  │
│          │          │              │          │                  │
│ id (PK)  │          │ id (PK)      │          │ id (PK)          │
│ username │          │ user_id (FK) │          │ data_source_id   │
│ email    │          │ name         │          │ table_name       │
│ password │          │ type         │          │ created_at       │
│ role     │          │ host/port    │          └──────────────────┘
│ ...      │          │ database     │
└────┬─────┘          │ username     │
     │                │ password     │
     │                │ ...          │
     │                └──┬───┬───────┘
     │                   │   │
     │      ┌────────────┘   └────────────┐
     │      │                             │
     │      ▼                             ▼
     │  ┌──────────────┐    ┌──────────────────────┐
     │  │  query_      │    │  table_descriptions  │
     │  │  histories   │    │                      │
     ├──│              │    │  id (PK)             │
     │  │ id (PK)      │    │  data_source_id (FK) │
     │  │ user_id (FK) │    │  table_name          │
     │  │ data_source_ │    │  description         │
     │  │   id (FK)    │    │  created_at          │
     │  │ question     │    └──────────────────────┘
     │  │ sql          │
     │  │ result(JSON) │    ┌──────────────────────┐
     │  │ status       │    │  field_descriptions  │
     │  │ error_msg    │    │                      │
     │  │ created_at   │    │  id (PK)             │
     │  └──────────────┘    │  data_source_id (FK) │
     │                      │  table_name          │
     └──────────────────────│  field_name          │
                            │  description         │
                            │  created_at          │
                            └──────────────────────┘
```

### 8.3 六张管理表详解

**1. users — 用户表**

存储注册用户信息。所有操作需通过 JWT 认证。

- 密码存储：SHA256(salt + password)，格式 `sha256${salt}${hash}`
- 角色：`admin`（可管理用户）或 `user`（默认）

**2. data_sources — 数据源配置表**

存储目标数据库的连接信息。

- 支持类型：`mysql` | `postgresql`
- 密码明文存储（需连接目标数据库），建议通过环境变量注入

**3. selected_tables — 已选数据表**

记录用户在每个数据源下选择了哪些表。这是 Text-to-SQL 的**查询范围限定**：用户选择哪些表，LLM 就只能基于这些表生成 SQL。

**4. query_histories — 查询历史**

记录每次查询的完整信息。result 字段以 JSON 字符串存储。

- 生命周期：`processing` → `success` / `failed`

**5. table_descriptions — 表语义描述**

用户自定义的表中文说明，同一数据源下表名唯一。

**6. field_descriptions — 字段语义描述**

用户自定义的字段中文说明，同一数据源下表名+字段名唯一。

### 8.4 连接池配置

管理数据库使用连接池，避免重复建连：

```python
# session.py
engine = create_engine(
    settings.admin_db_url,
    pool_size=5,          # 常驻 5 个连接
    max_overflow=10,      # 峰值额外 10 个
    pool_pre_ping=True,   # 使用前检测连接有效性
    echo=False
)
```

目标数据库不使用连接池（每次查询建连→执行→断开），避免长时间占用用户数据库连接。

---

## 九、API 接口与调用时序

### 9.1 完整 API 列表

```
/api/v1/auth/
  POST   /register                    # 注册
  POST   /login                       # 登录
  GET    /me                          # 当前用户

/api/v1/users/                        # (需 admin)
  GET    /                            # 用户列表
  GET    /{id}                        # 用户详情
  PUT    /{id}                        # 更新用户
  DELETE /{id}                        # 删除用户

/api/v1/data-sources/
  GET    /                            # 数据源列表
  POST   /                            # 创建数据源
  GET    /{id}                        # 数据源详情
  PUT    /{id}                        # 更新数据源
  DELETE /{id}                        # 删除数据源
  GET    /{id}/all-tables             # 浏览所有表
  GET    /{id}/tables                 # 已选表结构
  POST   /{id}/tables                 # 选择表
  GET    /{id}/selected-tables        # 已选表列表

  # 语义层 API
  GET    /{id}/semantic/tables        # 表描述列表
  POST   /{id}/semantic/tables        # 创建/更新表描述
  DELETE /{id}/semantic/tables/{name} # 删除表描述
  GET    /{id}/semantic/fields        # 字段描述列表
  POST   /{id}/semantic/fields        # 创建/更新字段描述
  PUT    /{id}/semantic/fields/{fid}  # 更新字段描述
  DELETE /{id}/semantic/fields/{fid}  # 删除字段描述
  POST   /{id}/semantic/import        # 批量导入
  GET    /{id}/semantic/export        # 批量导出

/api/v1/text-to-sql/
  POST   /query                       # 自然语言查询
  GET    /history                     # 查询历史列表
  GET    /history/{id}                # 查询历史详情
  DELETE /history/{id}                # 删除历史
  GET    /similar                     # 相似查询

/health                               # 健康检查
```

### 9.2 核心查询时序图

```
Client              API Layer          TextToSQLService    SchemaService   LLMClient   DBConnector   SecurityService
  │                     │                     │                  │              │            │              │
  │  POST /query        │                     │                  │              │            │              │
  │────────────────────>│                     │                  │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │  JWT 验证           │                  │              │            │              │
  │                     │──> get_current_user │                  │              │            │              │
  │                     │<── User object      │                  │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │  generate_and_execute(request, user, db)            │            │              │
  │                     │────────────────────>│                  │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  1. 鉴权         │              │            │              │
  │                     │                     │──> db.query(DS)  │              │            │              │
  │                     │                     │<── 确认归属      │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  2. 获取 Schema  │              │            │              │
  │                     │                     │─────────────────>│              │            │              │
  │                     │                     │                  │ Redis.get()  │            │              │
  │                     │                     │                  │ (缓存命中?)  │            │              │
  │                     │                     │                  │──────┐       │            │              │
  │                     │                     │                  │      │ miss  │            │              │
  │                     │                     │                  │      │       │ get_rich_    │              │
  │                     │                     │                  │      │       │ schema_text()│              │
  │                     │                     │                  │      │       │──────────────>│
  │                     │                     │                  │      │       │ CONNECT       │
  │                     │                     │                  │      │       │ SHOW FULL     │
  │                     │                     │                  │      │       │ COLUMNS       │
  │                     │                     │                  │      │       │ SELECT ...    │
  │                     │                     │                  │      │       │   LIMIT 3     │
  │                     │                     │                  │      │       │<──────────────│
  │                     │                     │                  │      │       │ schema text   │
  │                     │                     │                  │ Redis.setex()│              │
  │                     │                     │<─────────────────│              │            │              │
  │                     │                     │ schema 文本       │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  3. RAG 检索     │              │            │              │
  │                     │                     │──> rag_service   │              │            │              │
  │                     │                     │<── similar_queries│             │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  4. LLM 生成 SQL │              │            │              │
  │                     │                     │─────────────────────────────────>│            │              │
  │                     │                     │                                  │ DeepSeek   │              │
  │                     │                     │<─────────────────────────────────│            │              │
  │                     │                     │ SQL 字符串                       │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  5-6. 安全校验+消毒              │            │              │
  │                     │                     │─────────────────────────────────────────────────────>│
  │                     │                     │<─────────────────────────────────────────────────────│
  │                     │                     │                  │              │            │              │
  │                     │                     │  7. 执行 SQL     │              │            │              │
  │                     │                     │──────────────────────────────────>│              │
  │                     │                     │<──────────────────────────────────│              │
  │                     │                     │ results[]        │              │            │              │
  │                     │                     │                  │              │            │              │
  │                     │                     │  8. 结果脱敏     │              │            │              │
  │                     │                     │─────────────────────────────────────────────────────>│
  │                     │                     │<─────────────────────────────────────────────────────│
  │                     │                     │                  │              │            │              │
  │                     │                     │  9. 存储         │              │            │              │
  │                     │                     │──> QueryHistory  │              │            │              │
  │                     │                     │──> rag_store     │              │            │              │
  │                     │                     │                  │              │            │              │
  │  QueryResponse     │<────────────────────│                  │              │            │              │
  │<────────────────────│                     │                  │              │            │              │
```

---

## 十、部署架构

### 10.1 Docker Compose 拓扑

```
                    ┌─────────────────────────────────────────────┐
                    │              External Network                │
                    │                                            │
                    │  Port 5173 → Frontend (Vite)                │
                    │  Port 8000 → Backend (FastAPI)              │
                    └──────────────────┬──────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────┐
│                         Docker Network: text2sql-network            │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │    backend      │   │     redis       │   │    chromadb     │   │
│  │  (FastAPI)      │   │  (redis:7-alpine)│   │  (chromadb/     │   │
│  │  Port: 8000     │   │  Port: 6379     │   │   chroma:latest)│   │
│  │                 │   │                 │   │  Port: 8001→8000│   │
│  │ depends_on:     │   │ Vol: redis-data │   │                 │   │
│  │ - redis         │   │                 │   │ Vol: chroma-data│   │
│  │ - chromadb      │   │                 │   │                 │   │
│  │ - mysql         │   │                 │   │                 │   │
│  └────────┬────────┘   └─────────────────┘   └─────────────────┘   │
│           │                                                        │
│  ┌────────┴────────┐                                               │
│  │     mysql       │                                               │
│  │  (mysql:8.0)    │                                               │
│  │  Port: 3306     │                                               │
│  │                 │                                               │
│  │ text2sql_admin  │ ← 管理库 (ORM 建表)                           │
│  │ text2sql_demo   │ ← 示例业务库 (init.sql)                       │
│  │                 │                                               │
│  │ Vol: mysql-data │                                               │
│  └─────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 服务依赖关系

```
mysql ──────┐
            ├────> backend 启动 (等待健康检查)
redis ──────┤
            │
chromadb ───┘
```

### 10.3 环境变量流转

```
.env 文件                      docker-compose.yml               容器内
─────────────────────────────────────────────────────────────────────
LLM_API_KEY=sk-xxx     ────>   LLM_API_KEY=${LLM_API_KEY}  ───>  os.environ
LLM_MODEL=deepseek     ────>   LLM_MODEL=${LLM_MODEL}      ───>  settings.llm_model
ADMIN_DB_URL=...       ────>   ADMIN_DB_URL=...            ───>  settings.admin_db_url
SECRET_KEY=xxx         ────>   SECRET_KEY=${SECRET_KEY}    ───>  settings.secret_key
```

### 10.4 启动命令

```bash
# 开发模式 (本地 Python, 依赖 Docker 服务)
cd backend
pip install -r requirements.txt

# 先启动依赖服务
docker-compose up -d redis mysql chromadb

# 再启动后端
python main.py

# 生产模式 (全 Docker)
docker-compose up -d
```

### 10.5 端口映射

| 服务 | 容器内端口 | 宿主机端口 | 说明 |
|------|----------|-----------|------|
| backend | 8000 | 8000 | FastAPI HTTP |
| mysql | 3306 | 3306 | 管理库 + 业务库 |
| redis | 6379 | 6379 | Schema 缓存 |
| chromadb | 8000 | 8001 | 向量检索 API |

