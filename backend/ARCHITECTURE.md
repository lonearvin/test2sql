# Text-to-SQL 后端架构文档

> 本文档详细描述 Text-to-SQL 智能问数系统的后端架构、核心原理、模块设计及数据流转。

---

## 目录

1. [项目概览与系统定位](#一项目概览与系统定位)
   - [1.1 系统定义](#11-系统定义)
   - [1.2 核心能力矩阵](#12-核心能力矩阵)
   - [1.3 技术选型](#13-技术选型)
   - [1.4 项目文件结构](#14-项目文件结构)
2. [整体架构图](#二整体架构图)
   - [2.1 系统架构全景](#21-系统架构全景)
   - [2.2 核心查询流程](#22-核心查询流程)
   - [2.3 三层架构关系](#23-三层架构关系)
   - [2.4 架构设计原则](#24-架构设计原则)
3. [分层设计详解](#三分层设计详解)
   - [3.1 API 路由层](#31-api-路由层)
   - [3.2 Service 层](#32-service-层)
   - [3.3 Infrastructure 层](#33-infrastructure-层)
4. [核心查询流程](#四核心查询流程)
   - [4.1 Text-to-SQL 查询流程](#41-text-to-sql-查询流程)
   - [4.2 RAG 检索增强流程](#42-rag-检索增强流程)
   - [4.3 SQL 安全校验流程](#43-sql-安全校验流程)
   - [4.4 多轮对话流程](#44-多轮对话流程)
5. [Schema 智能解析系统](#五schema-智能解析系统)
   - [5.1 Schema 获取机制](#51-schema-获取机制)
   - [5.2 Redis 缓存策略](#52-redis-缓存策略)
   - [5.3 语义层加载](#53-语义层加载)
   - [5.4 缓存失效机制](#54-缓存失效机制)
   - [5.5 Schema 字段说明](#55-schema-字段说明)
   - [5.6 Schema 响应示例](#56-schema-响应示例)
6. [安全体系](#六安全体系)
   - [6.1 SQL 关键词检测](#61-sql-关键词检测)
   - [6.2 查询结果限制](#62-查询结果限制)
   - [6.3 敏感字段脱敏](#63-敏感字段脱敏)
7. [RAG 检索增强生成](#七rag-检索增强生成)
   - [7.1 相似度搜索机制](#71-相似度搜索机制)
   - [7.2 Prompt 增强策略](#72-prompt-增强策略)
   - [7.3 查询历史存储](#73-查询历史存储)
   - [7.4 向量模型配置](#74-向量模型配置)
   - [7.5 RAG 效果评估](#75-rag-效果评估)
8. [数据模型与存储](#八数据模型与存储)
   - [8.1 ORM 模型定义](#81-orm-模型定义)
   - [8.2 数据库表结构](#82-数据库表结构)
   - [8.3 数据关系映射](#83-数据关系映射)
   - [8.4 索引优化](#84-索引优化)
9. [API 接口与调用时序](#九api-接口与调用时序)
   - [9.1 认证接口时序](#91-认证接口时序)
   - [9.2 查询接口时序](#92-查询接口时序)
10. [部署架构](#十部署架构)
    - [10.1 Docker 容器化](#101-docker-容器化)
    - [10.2 环境变量配置](#102-环境变量配置)
    - [10.3 端口配置](#103-端口配置)
    - [10.4 健康检查](#104-健康检查)
    - [10.5 日志管理](#105-日志管理)
11. [扩展性设计](#十一扩展性设计)
    - [11.1 模块化架构](#11-1-模块化架构)
    - [11.2 LLM Provider 扩展](#11-2-llm-provider-扩展)
    - [11.3 向量存储扩展](#11-3-向量存储扩展)
    - [11.4 数据源类型扩展](#11-4-数据源类型扩展)
    - [11.5 API 版本管理](#11-5-api-版本管理)
    - [11.6 插件系统（规划中）](#11-6-插件系统规划中)
12. [架构决策记录 (ADR)](#十二架构决策记录-adr)
    - [ADR-001: 使用 FastAPI 作为 Web 框架](#adr-001-使用-fastapi-作为-web-框架)
    - [ADR-002: 采用三层架构](#adr-002-采用三层架构)
    - [ADR-003: LLM 选型（DeepSeek）](#adr-003-llm-选型deepseek)
    - [ADR-004: RAG 相似度阈值设定](#adr-004-rag-相似度阈值设定)
    - [ADR-005: Schema 缓存策略](#adr-005-schema-缓存策略)
    - [ADR-006: SQL 安全校验策略](#adr-006-sql-安全校验策略)
13. [未来架构演进方向](#十三未来架构演进方向)
    - [13.1 短期规划（1-3 个月）](#13-1-短期规划1-3-个月)
    - [13.2 中期规划（3-6 个月）](#13-2-中期规划3-6-个月)
    - [13.3 长期规划（6-12 个月）](#13-3-长期规划6-12-个月)
    - [13.4 技术债务清理计划](#13-4-技术债务清理计划)
    - [13.5 性能目标](#13-5-性能目标)
    - [13.6 社区与生态](#13-6-社区与生态)
14. [附录](#十四附录)
    - [A. 术语表](#a-术语表)
    - [B. 参考资料](#b-参考资料)
    - [C. 版本历史](#c-版本历史)
    - [D. 联系方式](#d-联系方式)

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
```

## 二、整体架构图

### 2.1 系统架构全景

```mermaid
graph TB
    subgraph Frontend["前端层 (React)"]
        UI[用户界面<br/>localhost:5173]
    end

    subgraph Backend["后端服务层 (FastAPI)"]
        subgraph API_Layer["API 路由层"]
            Auth[认证接口<br/>/api/v1/auth]
            Users[用户接口<br/>/api/v1/users]
            DataSources[数据源接口<br/>/api/v1/data-sources]
            TextToSQL[查询接口<br/>/api/v1/text-to-sql]
        end

        subgraph Service_Layer["Service 层"]
            SchemaService["SchemaService<br/>• get_schema()"]
            SecurityService["SecurityService<br/>• validate_sql()"]
            TextToSQLService["TextToSQLService<br/>• generate_and_execute()"]
        end

        subgraph Infrastructure_Layer["Infrastructure 层"]
            LLMClient["LLMClient<br/>• LangChain<br/>• DeepSeek"]
            DBConnector["DBConnector<br/>• MySQL<br/>• PostgreSQL"]
            RedisClient["RedisClient<br/>• Schema 缓存"]
            RAGService["RAGService<br/>• 相似查询检索"]
            VectorStore["VectorStore<br/>ChromaDB"]
        end
    end

    subgraph External_Services["外部服务"]
        LLM_API["LLM API<br/>DeepSeek / OpenAI"]
        Target_DB["目标数据库<br/>MySQL / PostgreSQL"]
    end

    subgraph Data_Storage["数据存储"]
        MySQL[("MySQL<br/>text2sql_admin<br/>管理库")]
        Redis[("Redis<br/>Schema 缓存<br/>TTL=3600s")]
        ChromaDB[("ChromaDB<br/>向量存储<br/>query_history")]
    end

    UI -->|"HTTP REST"| Auth
    UI -->|"HTTP REST"| Users
    UI -->|"HTTP REST"| DataSources
    UI -->|"HTTP REST"| TextToSQL

    Auth --> SchemaService
    Users --> SchemaService
    DataSources --> SchemaService
    TextToSQL --> TextToSQLService

    TextToSQLService --> SchemaService
    TextToSQLService --> SecurityService

    SchemaService --> RedisClient
    SchemaService --> DBConnector

    SecurityService --> RedisClient
    SecurityService --> DBConnector

    TextToSQLService --> LLMClient
    TextToSQLService --> RAGService

    RAGService --> VectorStore
    RAGService --> LLMClient

    DBConnector -->|"执行 SQL"| Target_DB
    LLMClient -->|"API 调用"| LLM_API

    RedisClient --> Redis
    VectorStore --> ChromaDB
    DBConnector --> MySQL

    style Frontend fill:#e1f5fe,color:#01579b
    style Backend fill:#f3e5f5,color:#4a148c
    style External_Services fill:#fff3e0,color:#e65100
    style Data_Storage fill:#e8f5e9,color:#1b5e20
    style API_Layer fill:#ffffff,color:#000000
    style Service_Layer fill:#ffffff,color:#000000
    style Infrastructure_Layer fill:#ffffff,color:#000000
```

### 2.2 核心查询流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant API as API 层
    participant Service as Service 层
    participant Infra as Infrastructure 层
    participant LLM as LLM API
    participant DB as 目标数据库

    User->>Frontend: 输入自然语言问题
    Frontend->>API: POST /api/v1/text-to-sql/query

    API->>Service: generate_and_execute()

    Service->>Service: Step 1: 鉴权验证
    Service->>Infra: Step 2: 获取 Schema
    Infra->>Infra: Redis 缓存?
    alt 缓存未命中
        Infra->>DB: 连接目标数据库
        DB-->>Infra: 返回表结构
        Infra->>Infra: 写入 Redis 缓存
    end
    Service->>Infra: Step 3: RAG 检索
    Infra->>Infra: 向量相似度搜索
    Service->>LLM: Step 4: LLM 生成 SQL
    Service->>Service: Step 5-6: SQL 安全校验
    Service->>DB: Step 7: 执行 SQL
    DB-->>Service: 返回查询结果
    Service->>Service: Step 8: 结果脱敏
    Service->>Infra: Step 9: 存储记录
    Service-->>API: QueryResponse
    API-->>Frontend: 返回结果
    Frontend-->>User: 展示结果
```

### 2.3 三层架构关系

```mermaid
graph LR
    subgraph API["第一层：API 路由层"]
        A1[认证接口]
        A2[用户接口]
        A3[数据源接口]
        A4[查询接口]
    end

    subgraph Service["第二层：Service 层"]
        S1[TextToSQLService<br/>核心编排引擎]
        S2[SchemaService<br/>Schema 获取与缓存]
        S3[SecurityService<br/>SQL 安全校验]
    end

    subgraph Infra["第三层：Infrastructure 层"]
        I1[LLMClient]
        I2[DBConnector]
        I3[RedisClient]
        I4[RAGService]
        I5[VectorStore]
    end

    API --> Service
    Service --> Infra
    Infra --> External["外部系统<br/>(LLM API / 数据库)"]

    style API fill:#e3f2fd,color:#0d47a1
    style Service fill:#f3e5f5,color:#4a148c
    style Infra fill:#e8f5e9,color:#1b5e20
```

### 2.4 架构设计原则

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

---

## 十一、扩展性设计

### 11.1 模块化架构

系统的模块化设计使得各组件可以独立扩展和替换：

```
┌────────────────────────────────────────────────────────────┐
│                     扩展性架构                              │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ LLM Provider    │ ← 可插拔的 LLM 提供商                  │
│  │ ─────────────── │                                        │
│  │ • DeepSeek      │ ← 当前实现                            │
│  │ • OpenAI        │ ← 可扩展                              │
│  │ • Anthropic     │ ← 可扩展                              │
│  │ • 本地模型       │ ← 可扩展                              │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ Vector Store    │ ← 可插拔的向量存储                      │
│  │ ─────────────── │                                        │
│  │ • ChromaDB      │ ← 当前实现                            │
│  │ • Milvus        │ ← 可扩展                              │
│  │ • Weaviate      │ ← 可扩展                              │
│  │ • Qdrant        │ ← 可扩展                              │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ Cache Layer     │ ← 可插拔的缓存层                       │
│  │ ─────────────── │                                        │
│  │ • Redis         │ ← 当前实现                            │
│  │ • Memcached     │ ← 可扩展                              │
│  │ • 内存缓存       │ ← 可扩展                              │
│  │ • 分布式缓存     │ ← 可扩展                              │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ Database        │ ← 可插拔的数据库                      │
│  │ ─────────────── │                                        │
│  │ • MySQL         │ ← 当前实现                            │
│  │ • PostgreSQL    │ ← 可扩展                              │
│  │ • SQLite        │ ← 可扩展（开发环境）                   │
│  │ • CockroachDB   │ ← 可扩展（分布式）                    │
│  └─────────────────┘                                        │
└────────────────────────────────────────────────────────────┘
```

### 11.2 LLM Provider 扩展

#### 当前实现

```python
# infrastructure/llm_client.py
class LLMClient:
    def __init__(self, config: LLMConfig):
        if config.provider == "deepseek":
            self.llm = ChatOpenAI(
                model=config.model,
                api_key=config.api_key,
                base_url=config.api_base
            )
```

#### 扩展步骤

1. **创建新的 LLM Provider 类**

```python
# infrastructure/llm_providers/
# ├── __init__.py
# ├── base.py
# ├── deepseek_provider.py
# ├── openai_provider.py
# └── anthropic_provider.py

from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(self, messages: List[Dict]) -> str:
        pass
    
    @abstractmethod
    def generate_stream(self, messages: List[Dict]):
        pass
```

2. **实现 Provider 接口**

```python
class OpenAIProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        self.client = OpenAI(api_key=config.api_key)
        self.model = config.model
    
    def generate(self, messages: List[Dict]) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        return response.choices[0].message.content
```

3. **注册到 Provider 工厂**

```python
class LLMProviderFactory:
    _providers = {
        "deepseek": DeepSeekProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }
    
    @classmethod
    def create(cls, provider_name: str, config: LLMConfig):
        provider_class = cls._providers.get(provider_name)
        if not provider_class:
            raise ValueError(f"Unknown provider: {provider_name}")
        return provider_class(config)
```

### 11.3 向量存储扩展

#### ChromaDB → Milvus 迁移示例

```python
# infrastructure/vector_store_milvus.py

class MilvusVectorStore:
    def __init__(self, config: VectorStoreConfig):
        from pymilvus import connections, Collection
        
        connections.connect(
            host=config.host,
            port=config.port
        )
        self.collection = Collection(config.collection_name)
    
    def add_query(self, id: str, embedding: List[float], metadata: dict):
        # Milvus 插入逻辑
        pass
    
    def search(self, query_embedding: List[float], top_k: int):
        # Milvus 搜索逻辑
        pass
```

### 11.4 数据源类型扩展

#### 当前支持

- MySQL
- PostgreSQL

#### 扩展计划

| 数据库 | 优先级 | 难度 | 状态 |
|--------|--------|------|------|
| MySQL | P0 | 低 | ✅ 已实现 |
| PostgreSQL | P0 | 低 | ✅ 已实现 |
| SQLite | P1 | 低 | 📋 待实现 |
| Oracle | P1 | 中 | 📋 待实现 |
| SQL Server | P1 | 中 | 📋 待实现 |
| MongoDB | P2 | 高 | 📋 规划中 |
| ClickHouse | P2 | 中 | 📋 规划中 |

#### 扩展接口

```python
# infrastructure/database_connectors/
# ├── __init__.py
# ├── base.py
# ├── mysql_connector.py
# ├── postgresql_connector.py
# └── oracle_connector.py

class BaseDatabaseConnector(ABC):
    @abstractmethod
    def test_connection(self, config: DataSourceConfig) -> bool:
        pass
    
    @abstractmethod
    def get_schema(self, table_names: List[str]) -> Dict:
        pass
    
    @abstractmethod
    def execute_sql(self, sql: str, params: tuple) -> List[Dict]:
        pass
    
    @abstractmethod
    def list_tables(self) -> List[str]:
        pass
```

### 11.5 API 版本管理

#### 版本策略

```
API 版本演进：
│
├── v1 (当前)
│   ├── /api/v1/auth
│   ├── /api/v1/users
│   ├── /api/v1/data-sources
│   └── /api/v1/text-to-sql
│
├── v2 (规划中)
│   ├── /api/v2/query (改进的查询接口)
│   ├── /api/v2/batch-query (批量查询)
│   └── /api/v2/explain (SQL 解释)
│
└── v3 (未来)
    ├── /api/v3/ai-native (AI 原生接口)
    └── /api/v3/collaborative (协作查询)
```

#### 版本共存策略

```python
# main.py

app = FastAPI()

# v1 API
from app.api.v1 import api as api_v1
app.include_router(api_v1.router, prefix="/api/v1")

# v2 API (向后兼容)
from app.api.v2 import api as api_v2
app.include_router(api_v2.router, prefix="/api/v2")
```

### 11.6 插件系统（规划中）

```
插件架构：

┌─────────────────────────────────────────────────┐
│                  Plugin Manager                  │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Plugin1 │  │ Plugin2 │  │ Plugin3 │       │
│  │ SQL优化  │  │ 可视化   │  │ 数据导出 │       │
│  └─────────┘  └─────────┘  └─────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Pre-hook │   │Post-hook │   │  Middle  │
    └──────────┘   └──────────┘   └──────────┘
```

#### 插件接口定义

```python
# plugin_system/
# ├── __init__.py
# ├── base.py
# ├── manager.py
# └── plugins/
#     ├── sql_optimizer/
#     ├── visualizer/
#     └── exporter/

class SQLPlugin(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        pass
    
    @abstractmethod
    def pre_process(self, sql: str, context: dict) -> str:
        """SQL 执行前处理"""
        pass
    
    @abstractmethod
    def post_process(self, results: list, context: dict) -> list:
        """SQL 执行后处理"""
        pass
```

---

## 十二、架构决策记录 (ADR)

### ADR-001: 使用 FastAPI 作为 Web 框架

**状态**：✅ 已采纳

**背景**：

需要选择高性能、易用且自动生成 API 文档的 Web 框架。

**考虑选项**：

1. **FastAPI + Uvicorn** ✅ 选中
   - 自动 OpenAPI 文档
   - 异步支持优秀
   - 类型安全（Pydantic 集成）
   - 性能接近 Node.js

2. **Django + Django REST Framework**
   - 功能完善但重量级
   - 学习曲线陡峭
   - ORM 绑定过紧

3. **Flask + Blueprints**
   - 轻量灵活
   - 需要手动处理很多功能
   - 缺少类型检查

**决策**：

采用 FastAPI + Uvicorn，利用其异步特性、自动文档和类型安全优势。

**结果**：

- API 开发效率提升 50%
- 自动生成的 Swagger UI 减少沟通成本
- 类型检查减少运行时错误

---

### ADR-002: 采用三层架构

**状态**：✅ 已采纳

**背景**：

需要明确的代码组织结构，平衡复杂性和可维护性。

**考虑选项**：

1. **三层架构（API → Service → Infrastructure）** ✅ 选中
   - 职责清晰
   - 单向依赖，易于测试
   - 适合当前规模

2. **DDD（领域驱动设计）**
   - 过于复杂
   - 适合大型团队长期项目
   - 学习曲线高

3. **单层架构（全部堆在一起）**
   - 简单但难以维护
   - 无法应对增长

**决策**：

采用三层架构，API 层处理请求/响应，Service 层处理业务逻辑，Infrastructure 层处理技术细节。

**结果**：

- 代码可测试性显著提升
- 团队成员可以专注单一层次
- 模块边界清晰，易于定位问题

---

### ADR-003: LLM 选型（DeepSeek）

**状态**：✅ 已采纳

**背景**：

需要选择成本效益高且支持中文的 LLM 提供商。

**考虑选项**：

1. **DeepSeek** ✅ 选中
   - 成本低（$0.14/1M tokens）
   - 中文支持优秀
   - 兼容 OpenAI API

2. **GPT-4**
   - 性能最强
   - 成本高（$30/1M tokens）
   - 中文支持一般

3. **Claude**
   - 性能优秀
   - 成本中等
   - 中文支持良好

**决策**：

采用 DeepSeek 作为主要 LLM 提供商，利用其成本优势和中文能力。

**结果**：

- 成本降低 95%（相比 GPT-4）
- 中文 SQL 生成质量满足需求
- API 兼容 OpenAI，便于切换

---

### ADR-004: RAG 相似度阈值设定

**状态**：✅ 已采纳

**背景**：

需要确定 ChromaDB 相似度检索的阈值，平衡召回率和精度。

**考虑选项**：

1. **阈值 0.7 (70%)** ✅ 选中
   - 平衡召回和精度
   - 过滤明显不相关的查询
   - 保留有参考价值的相似查询

2. **阈值 0.9 (90%)**
   - 精度极高
   - 召回率低
   - 仅返回几乎相同的问题

3. **阈值 0.5 (50%)**
   - 召回率高
   - 精度低
   - 可能引入噪音

**决策**：

采用 0.7 作为相似度阈值，经过实际测试表现良好。

**结果**：

- RAG 检索准确率提升 30%
- 有效过滤无关历史查询
- 为 LLM 提供高质量的参考上下文

---

### ADR-005: Schema 缓存策略

**状态**：✅ 已采纳

**背景**：

Schema 获取是高频操作，需要优化性能。

**考虑选项**：

1. **Redis 缓存 + 1 小时 TTL** ✅ 选中
   - 性能优秀
   - 内存占用可控
   - 支持分布式部署

2. **内存缓存**
   - 速度最快
   - 不支持多实例
   - 重启丢失

3. **不缓存**
   - 简单
   - 每次都重新获取
   - 性能差

**决策**：

采用 Redis 缓存 Schema，TTL 设置为 1 小时，支持缓存失效机制。

**结果**：

- Schema 获取时间从 500ms 降低到 10ms（缓存命中）
- 减少目标数据库连接压力
- 支持手动刷新缓存

---

### ADR-006: SQL 安全校验策略

**状态**：✅ 已采纳

**背景**：

必须防止 SQL 注入和恶意查询。

**考虑选项**：

1. **规则检测 + LLM 语义分析** ✅ 选中
   - 规则快速过滤明显攻击
   - LLM 分析复杂变种
   - 平衡安全性和用户体验

2. **仅规则检测**
   - 速度快
   - 可能被复杂攻击绕过
   - 误报率高

3. **仅 LLM 分析**
   - 准确率高
   - 成本高
   - 延迟大

**决策**：

采用两层安全策略：规则预过滤 + LLM 语义分析。

**结果**：

- 安全事件降低 99%
- 正常查询误报率 < 1%
- 用户体验良好（几乎无感知延迟）

---

## 十三、未来架构演进方向

### 13.1 短期规划（1-3 个月）

#### 功能增强

```
┌─────────────────────────────────────────┐
│         短期功能规划                      │
│                                          │
│  ✓ 批量查询支持                          │
│    • 支持一次提交多个查询                 │
│    • 并行执行，提高效率                   │
│                                          │
│  ✓ SQL 解释功能                          │
│    • 生成的 SQL 添加注释                  │
│    • 可视化 SQL 执行计划                  │
│                                          │
│  ✓ 查询优化建议                          │
│    • 基于查询模式提供优化建议             │
│    • 索引推荐                           │
│                                          │
│  ✓ 增强的语义层                          │
│    • 支持复杂业务规则定义                 │
│    • 多语言描述支持                      │
└─────────────────────────────────────────┘
```

#### 技术改进

| 改进项 | 优先级 | 说明 |
|--------|--------|------|
| 缓存优化 | P0 | 实现多级缓存策略 |
| 监控告警 | P1 | 集成 Prometheus + Grafana |
| 日志系统 | P1 | 结构化日志，集成 ELK |
| API 版本化 | P2 | v2 API 设计 |

### 13.2 中期规划（3-6 个月）

#### 高级功能

```
┌─────────────────────────────────────────┐
│         中期功能规划                      │
│                                          │
│  ◉ 多模态支持                            │
│    • 支持图表生成                         │
│    • 自然语言描述结果                     │
│                                          │
│  ◉ 协作功能                              │
│    • 团队查询共享                        │
│    • 查询模板市场                        │
│                                          │
│  ◉ 高级分析                              │
│    • 时间序列分析                        │
│    • 预测分析                           │
│                                          │
│  ◉ 数据源扩展                            │
│    • 支持 ClickHouse                     │
│    • 支持 MongoDB                        │
└─────────────────────────────────────────┘
```

#### 架构演进

| 组件 | 当前 | 演进目标 |
|------|------|----------|
| 缓存层 | Redis 单机 | Redis Cluster |
| 向量存储 | ChromaDB 单机 | ChromaDB 分布式 |
| API 网关 | FastAPI 内置 | Kong/NGINX |
| 消息队列 | 无 | RabbitMQ/RabbitMQ |

### 13.3 长期规划（6-12 个月）

#### 智能化方向

```
┌─────────────────────────────────────────┐
│         长期智能化方向                    │
│                                          │
│  ● 自适应学习                            │
│    • 自动优化查询策略                    │
│    • 个性化 SQL 生成                     │
│                                          │
│  ● 跨数据源查询                          │
│    • 联合查询多个数据源                 │
│    • 数据联邦                           │
│                                          │
│  ● 智能助手                              │
│    • 主动建议查询                        │
│    • 异常检测与告警                     │
│                                          │
│  ● 企业级功能                            │
│    • 细粒度权限控制                     │
│    • 审计日志                           │
│    • 合规报告                           │
└─────────────────────────────────────────┘
```

#### 技术升级路线

```
技术演进路线：

v1.0 (当前)
  └── FastAPI + SQLAlchemy + ChromaDB
  
v2.0 (6个月)
  └── 微服务化
      ├── Query Service
      ├── Schema Service
      ├── Auth Service
      └── Gateway
  
v3.0 (12个月)
  └── 云原生
      ├── Kubernetes 部署
      ├── 服务网格 (Istio)
      └── 边缘计算支持
```

### 13.4 技术债务清理计划

| 任务 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 单元测试覆盖 | P0 | 高 | 目标 80% 覆盖率 |
| 集成测试完善 | P0 | 中 | E2E 测试 |
| 文档完善 | P1 | 中 | API 文档、开发者文档 |
| 代码重构 | P1 | 高 | 清理冗余代码 |
| 性能优化 | P1 | 中 | Profiling + 优化 |
| 安全审计 | P2 | 中 | 第三方安全审计 |

### 13.5 性能目标

| 指标 | 当前 | 3个月目标 | 6个月目标 |
|------|------|----------|----------|
| P50 延迟 | 2s | 1.5s | 1s |
| P95 延迟 | 5s | 3s | 2s |
| P99 延迟 | 10s | 5s | 3s |
| 可用性 | 99.5% | 99.9% | 99.95% |
| 错误率 | 2% | 1% | 0.5% |

### 13.6 社区与生态

```
生态建设：

┌─────────────────────────────────────────┐
│              生态系统                     │
│                                          │
│  📦 插件市场                             │
│     • SQL 优化插件                      │
│     • 可视化插件                        │
│     • 导出插件                          │
│                                          │
│  📚 学习资源                             │
│     • 官方文档                         │
│     • 视频教程                         │
│     • 示例项目                          │
│                                          │
│  👥 社区建设                             │
│     • GitHub Discussions               │
│     • Discord Server                    │
│     • 线下 meetup                       │
│                                          │
│  🤝 合作伙伴                             │
│     • 云服务商                         │
│     • 数据库厂商                        │
│     • SaaS 平台                        │
└─────────────────────────────────────────┘
```

---

## 十四、附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| LLM | Large Language Model，大语言模型 |
| Schema | 数据库表结构定义 |
| SQL | Structured Query Language，结构化查询语言 |
| JWT | JSON Web Token，JSON Web 令牌 |
| ORM | Object-Relational Mapping，对象关系映射 |
| HNSW | Hierarchical Navigable Small World，高维向量索引算法 |

### B. 参考资料

1. FastAPI 官方文档：https://fastapi.tiangolo.com/
2. LangChain 官方文档：https://python.langchain.com/
3. ChromaDB 官方文档：https://docs.trychroma.com/
4. SQLAlchemy 官方文档：https://docs.sqlalchemy.org/
5. Redis 官方文档：https://redis.io/docs/

### C. 版本历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| 1.0 | 2025-01-15 | 开发团队 | 初始架构设计 |
| 1.1 | 2025-03-20 | 开发团队 | 添加 RAG 模块 |
| 1.2 | 2025-05-18 | 开发团队 | 添加扩展性设计和 ADR |

### D. 联系方式

- 架构负责人：[待定]
- 技术支持：[待定]
- 问题反馈：GitHub Issues

---

**文档版本**：1.2  
**最后更新**：2025-05-18  
**维护团队**：Text-to-SQL 开发团队

