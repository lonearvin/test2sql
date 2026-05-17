# Text-to-SQL 后端服务

基于 FastAPI 的智能 Text-to-SQL 服务，支持自然语言转 SQL 查询，集成 RAG（检索增强生成）、多轮对话、多层安全防护。

---

## 目录

- [项目概览](#项目概览)
- [系统架构](#系统架构)
- [分层设计](#分层设计)
- [核心流程](#核心流程)
- [项目结构](#项目结构)
- [API 接口文档](#api-接口文档)
- [数据模型](#数据模型)
- [配置说明](#配置说明)
- [环境配置](#环境配置)
- [快速开始](#快速开始)
- [测试方法](#测试方法)
- [Docker 部署](#docker-部署)
- [安全机制](#安全机制)
- [维护指南](#维护指南)
- [故障排查](#故障排查)

---

## 项目概览

### 系统定位

Text-to-SQL 是一个**智能问数系统**，核心能力是：用户用自然语言提出问题（如"上个月销售额最高的5个产品是什么？"），系统自动理解数据库结构，生成正确的 SQL 并执行，返回结构化查询结果。

### 核心能力矩阵

| 能力 | 说明 |
|------|------|
| **自然语言 → SQL** | 将中文/英文问题转化为 MySQL/PostgreSQL 查询 |
| **Schema 智能解析** | 自动提取 COMMENT / 主键 / 外键 / 样本数据，理解表和字段含义 |
| **RAG 检索增强** | 历史成功查询的向量检索，增强 LLM 生成准确性 |
| **多轮对话** | 支持上下文连续问答，理解代词和省略 |
| **多层安全** | SQL 关键词检测 + 结果 LIMIT + 敏感字段脱敏 + 用户数据隔离 |
| **语义层** | 用户可为表和字段添加中文业务说明，覆盖 COMMENT |
| **多数据源** | 支持 MySQL 和 PostgreSQL，按用户隔离管理 |

### 技术选型

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

---

## 系统架构

```mermaid
graph TB
    subgraph Frontend["前端层 (React)"]
        UI[用户界面<br/>localhost:5173]
    end

    subgraph Backend["后端服务层 (FastAPI)"]
        subgraph API_Layer["API 路由层"]
            Auth[/auth<br/>认证鉴权]
            Users[/users<br/>用户管理]
            DataSources[/data-sources<br/>数据源管理 + 语义层]
            TextToSQL[/text-to-sql<br/>核心查询引擎]
        end

        subgraph Service_Layer["Service 层"]
            SchemaService["SchemaService<br/>• get_schema()<br/>• Redis 缓存管理"]
            SecurityService["SecurityService<br/>• validate_sql()<br/>• sanitize_sql()"]
            TextToSQLService["TextToSQLService<br/>• generate_and_execute()<br/>• 多轮对话编排"]
        end

        subgraph Infrastructure_Layer["Infrastructure 层"]
            LLMClient["LLMClient<br/>• LangChain<br/>• DeepSeek"]
            DBConnector["DBConnector<br/>• MySQL/PG"]
            RedisClient["RedisClient<br/>• Schema 缓存"]
            RAGService["RAGService<br/>• 相似查询检索"]
            VectorStore["VectorStore<br/>ChromaDB"]
        end
    end

    subgraph Data_Storage["数据存储层"]
        MySQL[("MySQL<br/>text2sql_admin<br/>管理库")]
        Redis[("Redis<br/>Schema 缓存<br/>TTL=3600s")]
        ChromaDB[("ChromaDB<br/>向量存储<br/>query_history")]
    end

    subgraph External["外部服务"]
        LLM_API["LLM API<br/>DeepSeek / OpenAI"]
        Target_DB["目标数据库<br/>MySQL / PostgreSQL"]
    end

    UI -->|"HTTP REST"| Auth & Users & DataSources & TextToSQL

    Auth & Users & DataSources --> SchemaService
    TextToSQL --> TextToSQLService

    TextToSQLService --> SchemaService & SecurityService

    SchemaService --> RedisClient & DBConnector
    SecurityService --> RedisClient & DBConnector

    TextToSQLService --> LLMClient & RAGService

    RAGService --> VectorStore & LLMClient

    DBConnector -->|"执行 SQL"| Target_DB
    LLMClient -->|"API 调用"| LLM_API

    RedisClient --> Redis
    VectorStore --> ChromaDB
    DBConnector --> MySQL

    style Frontend fill:#e1f5fe,color:#01579b
    style Backend fill:#f3e5f5,color:#4a148c
    style Data_Storage fill:#e8f5e9,color:#1b5e20
    style External fill:#fff3e0,color:#e65100
```

---

## 分层设计

系统采用三层架构，各层职责明确、单向依赖：

### 第一层：API 层 (`app/api/`)

**职责**：接收 HTTP 请求，参数校验，权限控制，路由分发。

| 路由前缀 | 端点文件 | 功能描述 |
|----------|----------|----------|
| `/api/v1/auth` | `endpoints/auth.py` | 用户注册、登录、JWT 令牌签发与验证 |
| `/api/v1/users` | `endpoints/users.py` | 用户信息 CRUD（管理员权限） |
| `/api/v1/data-sources` | `endpoints/data_sources.py` | 数据源增删改查、连接测试、数据表选择 |
| `/api/v1/text-to-sql` | `endpoints/text_to_sql.py` | 自然语言查询、历史记录、相似查询 |

### 第二层：Service 层 (`app/services/`)

**职责**：核心业务逻辑编排，协调各基础设施组件完成业务流程。

| 服务 | 文件 | 功能 |
|------|------|------|
| `TextToSQLService` | `text_to_sql_service.py` | 核心编排器，串联 Schema 获取 → RAG 检索 → LLM 生成 → 安全校验 → SQL 执行 → 结果存储 |
| `SchemaService` | `schema_service.py` | 获取数据库表结构，支持 Redis 缓存（TTL=3600s） |
| `SecurityService` | `security_service.py` | SQL 关键词检测、敏感字段识别、查询结果脱敏 |

### 第三层：Infrastructure 层 (`app/infrastructure/`)

**职责**：底层技术实现，与外部系统交互。

| 组件 | 文件 | 功能 |
|------|------|------|
| `LLMClient` | `llm_client.py` | 基于 LangChain 封装 LLM 调用，支持多轮对话和 RAG 上下文增强 |
| `DatabaseConnector` | `database_connector.py` | MySQL / PostgreSQL 连接管理、Schema 提取、SQL 执行、类型转换 |
| `RedisClient` | `redis_client.py` | Redis 连接与缓存操作（字符串/JSON 存取） |
| `VectorStore` | `vector_store.py` | ChromaDB 向量数据库封装，查询嵌入存储、相似度检索 |
| `RAGService` | `rag_service.py` | RAG 检索服务，相似查询搜索 + Prompt 构建 |

---

## 核心流程

### Text-to-SQL 查询流程

```
用户输入问题
      │
      ▼
┌─────────────────┐
│ 1. 鉴权验证     │ ──── 校验 JWT Token，确认用户身份
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. 获取 Schema  │ ──── Redis 缓存命中 → 直接返回
└────────┬────────┘       缓存未命中 → 连接数据库，读取选中表结构
         ▼
┌─────────────────┐
│ 3. RAG 检索     │ ──── 将问题向量化，在 ChromaDB 中搜索相似历史查询
└────────┬────────┘       筛选相似度 ≥ 0.7 的结果（最多 3 条）
         ▼
┌─────────────────┐
│ 4. LLM 生成 SQL │ ──── 拼接 System Prompt + 对话历史 + 相似查询 → LLM
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. SQL 安全校验 │ ──── 检查首 token 是否为 SELECT
└────────┬────────┘       扫描禁止关键字（DROP/DELETE/TRUNCATE 等）
         ▼               检查敏感字段（password/token/secret 等）
┌─────────────────┐
│ 6. SQL 消毒     │ ──── 自动追加 LIMIT（默认 1000），防止全表扫描
└────────┬────────┘
         ▼
┌─────────────────┐
│ 7. 执行 SQL     │ ──── 连接目标数据库，执行查询，类型转换
└────────┬────────┘       （Decimal→float, datetime→ISO 字符串）
         ▼
┌─────────────────┐
│ 8. 结果处理     │ ──── 敏感字段脱敏：password → "***"
└────────┬────────┘
         ▼
┌─────────────────┐
│ 9. 存储记录     │ ──── 写入 SQLite 查询历史 + ChromaDB 向量索引
└────────┬────────┘
         ▼
       返回结果
```

### RAG 检索增强流程

```
┌──────────────────────────────────────────────────────────────┐
│                    RAG 检索增强流程                            │
│                                                               │
│  1. 问题向量化                                                │
│     ┌──────────────────────────────────────┐                 │
│     │ sentence-transformers (all-MiniLM-L6-v2) │              │
│     │ "查询所有订单" → [0.123, -0.456, ...]     │             │
│     └──────────────────┬───────────────────┘                 │
│                        ▼                                      │
│  2. ChromaDB 向量检索                                         │
│     ┌──────────────────────────────────────┐                 │
│     │ Collection: query_history            │                 │
│     │ Index: HNSW (近似最近邻)              │                 │
│     │ Similarity: Cosine (余弦相似度)        │                 │
│     │ Filter: data_source_id 匹配           │                 │
│     │ Threshold: ≥ 0.7 (70% 相似度)         │                 │
│     └──────────────────┬───────────────────┘                 │
│                        ▼                                      │
│  3. Prompt 增强                                              │
│     ┌──────────────────────────────────────┐                 │
│     │ 参考的历史查询：                       │                 │
│     │                                       │                 │
│     │ 示例 1：                              │                 │
│     │   问题：查看所有产品的总销售额          │                 │
│     │   SQL：SELECT SUM(total) FROM orders  │                 │
│     │                                       │                 │
│     │ 当前问题：本月销售额是多少？            │                 │
│     │                                       │                 │
│     │ + System Prompt + Schema              │                 │
│     └──────────────────┬───────────────────┘                 │
│                        ▼                                      │
│  4. 发送给 LLM → 生成 SQL                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### SQL 安全校验流程

```
┌──────────────────────────────┐
│        SQL 安全校验           │
└──────────────────────────────┘

        接收 SQL
           │
           ▼
    ┌─────────────┐
    │ 去除注释     │ ──── 移除 -- 行注释, /* */ 块注释
    └──────┬──────┘
           ▼
    ┌─────────────┐      拒绝
    │ 首 token 是  │───否──→ "只允许执行 SELECT 查询"
    │ SELECT？    │
    └──────┬──────┘
           │ 是
           ▼
    ┌─────────────┐      拒绝
    │ 禁止关键字   │───是──→ "SQL 包含禁止关键字: DROP"
    │ 检测？      │
    └──────┬──────┘   DROP, DELETE, TRUNCATE, ALTER, CREATE
           │ 否       INSERT, UPDATE, GRANT, REVOKE, EXEC...
           ▼
    ┌─────────────┐    脱敏
    │ 含敏感字段？ │───是──→ password → "***"
    └──────┬──────┘        token → "***"
           │ 否            secret → "***"
           ▼
    ┌─────────────┐
    │ LIMIT 检查  │ ──── 无 LIMIT → 自动追加 LIMIT 1000
    └──────┬──────┘       超过上限 → 降低至上限值
           ▼
      校验通过，执行
```

---

## 项目结构

```
backend/
│
├── main.py                          # FastAPI 应用入口，注册中间件和路由
├── requirements.txt                 # Python 依赖
├── Dockerfile                       # Docker 镜像构建文件
├── docker-compose.yml              # Docker Compose 编排文件
├── .env                             # 环境变量（API Key、数据库地址等）
│
└── app/                             # 应用主目录
    │
    ├── config/                      # 配置管理
    │   └── settings.py              # pydantic-settings 配置类，读取 .env
    │
    ├── models/                      # 数据模型
    │   └── database.py              # SQLAlchemy ORM 模型定义
    │                                #   User, DataSource, SelectedTable, QueryHistory
    │
    ├── schemas/                     # 请求/响应模型（Pydantic）
    │   ├── auth.py                  # Token, TokenData, UserCreate, UserResponse
    │   ├── user.py                  # UserUpdate, UserResponse
    │   ├── data_source.py           # DataSourceCreate/Update/Response, TableInfo
    │   ├── text_to_sql.py           # QueryRequest, QueryResponse, QueryHistoryResponse
    │   └── semantic.py              # 语义层 Schema（表/字段描述 CRUD + 导入导出）
    │
    ├── db/                          # 数据库会话
    │   └── session.py               # 连接池管理、Session 工厂、自动建表
    │
    ├── api/                         # API 路由层
    │   └── v1/
    │       ├── api.py               # 路由注册中心，汇总所有子路由
    │       └── endpoints/           # 端点实现
    │           ├── auth.py          # POST /register, /login, GET /me
    │           ├── users.py         # CRUD /users
    │           ├── data_sources.py  # CRUD /data-sources, 表选择
    │           └── text_to_sql.py   # POST /query, GET /history, /similar
    │
    ├── services/                    # 业务逻辑层
    │   ├── text_to_sql_service.py   # generate_and_execute(), get_history()
    │   ├── schema_service.py        # get_schema(), invalidate_cache()
    │   └── security_service.py      # validate_sql(), sanitize_sql(), mask()
    │
    └── infrastructure/              # 基础设施层
        ├── llm_client.py            # LangChain + DeepSeek，多轮对话 + RAG
        ├── database_connector.py     # MySQL / PostgreSQL 连接与执行
        ├── redis_client.py          # Redis 缓存客户端
        ├── vector_store.py          # ChromaDB 向量存储
        └── rag_service.py           # RAG 检索与 Prompt 构建
```

---

## API 接口文档

启动服务后访问自动生成的交互式文档：

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 认证接口 `/api/v1/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录，返回 JWT Token | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |

### 用户接口 `/api/v1/users`

| 方法 | 路径 | 说明 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/` | 用户列表（分页） | 是 | admin |
| GET | `/{id}` | 用户详情 | 是 | admin/本人 |
| PUT | `/{id}` | 更新用户 | 是 | admin/本人 |
| DELETE | `/{id}` | 删除用户 | 是 | admin |

### 数据源接口 `/api/v1/data-sources`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/` | 当前用户的所有数据源 | 是 |
| GET | `/{id}` | 单个数据源详情 | 是 |
| POST | `/` | 创建数据源（自动测试连接） | 是 |
| PUT | `/{id}` | 更新数据源 | 是 |
| DELETE | `/{id}` | 删除数据源（清空关联表和缓存） | 是 |
| GET | `/{id}/tables` | 获取已选数据表 | 是 |
| POST | `/{id}/tables` | 选择数据表 | 是 |
| GET | `/{id}/selected-tables` | 查看已选表列表 | 是 |
| GET | `/{id}/all-tables` | 浏览数据源所有表 | 是 |

#### `POST /query` 请求示例

```json
{
  "data_source_id": "uuid-xxxx",
  "question": "上个月销售额最高的 5 个产品是什么？",
  "conversation_history": []
}
```

#### `POST /query` 响应示例

```json
{
  "id": "query-uuid-xxxx",
  "sql": "SELECT product_name, SUM(amount) AS total FROM orders WHERE created_at >= '2025-03-01' GROUP BY product_name ORDER BY total DESC LIMIT 5",
  "results": [
    {"product_name": "iPhone 15 Pro", "total": 99990.0},
    {"product_name": "MacBook Pro 14", "total": 59997.0}
  ],
  "status": "success",
  "error_message": null,
  "conversation_history": [
    {"role": "user", "content": "上个月销售额最高的 5 个产品是什么？"},
    {"role": "assistant", "content": "SQL: SELECT ...\n结果: 5 条记录"}
  ]
}
```

---

## 数据模型

### Users (用户表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(36) | UUID 主键 |
| username | String(100) | 用户名，唯一 |
| email | String(100) | 邮箱，唯一 |
| hashed_password | String(255) | 密码哈希（sha256 格式） |
| full_name | String(200) | 全名 |
| phone | String(20) | 手机号 |
| role | String(50) | 角色：admin / user |
| is_active | Boolean | 账号启用状态 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### DataSources (数据源表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(36) | UUID 主键 |
| user_id | String(36) | 所属用户，关联 users.id |
| name | String(100) | 数据源名称 |
| type | String(20) | 数据库类型：mysql / postgresql |
| host | String(255) | 数据库主机地址 |
| port | Integer | 数据库端口 |
| database | String(100) | 数据库名 |
| username | String(100) | 数据库用户名 |
| password | String(255) | 数据库密码 |
| description | Text | 描述 |
| is_active | Boolean | 启用状态 |
| created_at | DateTime | 创建时间 |

### SelectedTables (已选表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(36) | UUID 主键 |
| data_source_id | String(36) | 关联数据源 |
| table_name | String(100) | 表名 |

### QueryHistories (查询历史)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(36) | UUID 主键 |
| user_id | String(36) | 执行查询的用户 |
| data_source_id | String(36) | 查询的数据源 |
| question | Text | 原始自然语言问题 |
| sql | Text | 生成的 SQL |
| result | Text | 查询结果（JSON） |
| chart_type | String(50) | 图表类型 |
| status | String(20) | 状态：processing / success / failed |
| error_message | Text | 错误信息 |
| created_at | DateTime | 创建时间 |

---

## 配置说明

所有配置通过 `.env` 文件管理，使用 `pydantic-settings` 加载。

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `app_name` | `text2sql-service` | 应用名称 |
| `app_host` | `0.0.0.0` | 服务绑定地址 |
| `app_port` | `8000` | 服务端口 |
| `debug` | `true` | 调试模式 |
| `llm_api_key` | - | **必需**，LLM API 密钥 |
| `llm_api_base` | `https://api.openai.com/v1` | LLM API 地址 |
| `llm_model` | `gpt-4o-mini` | 使用的模型名称 |
| `llm_temperature` | `0.1` | LLM 温度（越低越确定） |
| `redis_host` | `localhost` | Redis 地址 |
| `redis_port` | `6379` | Redis 端口 |
| `redis_db` | `0` | Redis 数据库编号 |
| `redis_password` | - | Redis 密码 |
| `chroma_host` | `localhost` | ChromaDB 地址 |
| `chroma_port` | `8000` | ChromaDB 端口 |
| `chroma_use_remote` | `false` | 是否使用远程 ChromaDB |
| `admin_db_url` | `mysql+mysqlconnector://...` | MySQL 管理数据库 URL |
| `secret_key` | - | JWT 签名密钥 |
| `algorithm` | `HS256` | JWT 算法 |
| `access_token_expire_minutes` | `30` | Token 有效期（分钟） |
| `sensitive_fields` | `password,token,secret,salt` | 需脱敏的字段 |
| `max_results` | `1000` | 查询结果最大行数 |

---

## 环境配置

### 前置条件

- Python 3.8+
- Redis（可选，用于 Schema 缓存）
- ChromaDB（可选，用于向量检索）
- MySQL 或 PostgreSQL（目标数据库）

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 应用配置
APP_NAME=text2sql-service
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true

# LLM 配置（必需）
LLM_API_KEY=your-deepseek-api-key
LLM_API_BASE=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.1

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# ChromaDB 配置（可选）
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_USE_REMOTE=false

# 数据库配置
ADMIN_DB_URL=mysql+mysqlconnector://text2sql:text2sql123@localhost:3306/text2sql_admin

# JWT 配置
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 安全配置
SENSITIVE_FIELDS=password,token,secret,salt,api_key
MAX_RESULTS=1000
```

### 3. 启动 Redis（可选）

```bash
# Docker 方式
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 或本地安装
redis-server
```

### 4. 启动 ChromaDB（可选）

```bash
docker run -d --name chromadb -p 8001:8000 chromadb/chroma:latest
```

---

## 快速开始

### 方式一：本地启动

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env  # 如果有模板文件
# 编辑 .env，填入配置

# 3. 启动服务
python main.py
```

服务启动后自动创建 SQLite 管理数据库，访问 `http://localhost:8000/docs` 查看 API 文档。

### 方式二：Docker 部署

```bash
# 在项目根目录
docker-compose up -d
```

会启动以下服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| backend | 8000 | FastAPI 后端 |
| redis | 6379 | Redis 缓存 |
| chromadb | 8001 | ChromaDB 向量数据库 |
| mysql | 3306 | MySQL 管理数据库 + 示例业务数据库 |

---

## 测试方法

### 1. 单元测试

使用 pytest 进行单元测试：

```bash
# 安装测试依赖
pip install pytest pytest-asyncio httpx

# 运行测试
pytest tests/ -v

# 运行特定测试文件
pytest tests/test_auth.py -v

# 运行特定测试用例
pytest tests/test_auth.py::test_login -v
```

### 2. 集成测试

```bash
# 运行集成测试
python test_integration.py
```

### 3. API 手动测试

启动服务后，使用 curl 或 Swagger UI 测试：

```bash
# 健康检查
curl http://localhost:8000/health

# 用户注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# 用户登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 创建数据源
curl -X POST http://localhost:8000/api/v1/data-sources \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","type":"mysql","host":"localhost","port":3306,"database":"test","username":"root","password":"password"}'
```

### 4. 性能测试

使用 Apache Bench 或 wrk：

```bash
# 简单性能测试
ab -n 100 -c 10 http://localhost:8000/health

# 或使用 wrk
wrk -t10 -c100 -d30s http://localhost:8000/health
```

---

## Docker 部署

### docker-compose.yml 结构

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_API_BASE=${LLM_API_BASE}
      - REDIS_HOST=redis
      - CHROMA_HOST=chromadb
    depends_on:
      - mysql
      - redis
      - chromadb
    networks:
      - text2sql-network

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=text2sql_admin
      - MYSQL_USER=text2sql
      - MYSQL_PASSWORD=text2sql123
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - text2sql-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - text2sql-network

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    networks:
      - text2sql-network

volumes:
  mysql-data:

networks:
  text2sql-network:
    driver: bridge
```

### 启动步骤

```bash
# 1. 构建并启动所有服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f backend

# 4. 初始化数据库（首次）
docker-compose exec mysql mysql -uroot -prootpassword -e "CREATE DATABASE IF NOT EXISTS text2sql_demo;"

# 5. 停止服务
docker-compose down

# 6. 完全清理
docker-compose down -v
```

---

## 安全机制

系统内置多层安全防护：

### 1. SQL 关键词检测

禁止执行非查询语句，拦截以下关键字：

```
DROP, DELETE, TRUNCATE, ALTER, CREATE,
INSERT, UPDATE, GRANT, REVOKE, EXEC, EXECUTE,
XP_*, SP_*
```

### 2. 查询结果限制

- 所有 SQL 自动追加 `LIMIT` 子句（默认 1000 行）
- 已有 LIMIT 会检查上限，防止大数据量返回

### 3. 敏感字段脱敏

检测到以下字段时自动脱敏：`password`, `token`, `secret`, `salt`, `api_key`。脱敏后显示为 `"***"`。

### 4. 数据隔离

- 数据源按用户隔离（只能访问自己创建的数据源）
- 查询历史按用户隔离
- JWT Token 认证所有 API

### 5. SQL 注入防护

- 参数化查询，所有 SQL 执行使用参数绑定
- 标识符白名单验证（表名、列名只允许字母数字下划线）

---

## 维护指南

### 1. 日志管理

#### 查看日志

```bash
# 实时查看后端日志
tail -f logs/app.log

# 查看最近 100 行
tail -n 100 logs/app.log

# 按日期查看
grep "2025-01-15" logs/app.log
```

#### 日志配置

在 `.env` 中配置日志级别：

```env
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### 2. 性能监控

#### 监控指标

- **响应时间**：使用 FastAPI 内置中间件记录
- **错误率**：监控 500 错误的比例
- **数据库连接池**：检查活动连接数

#### 监控工具

```bash
# 使用 Prometheus（待集成）
curl http://localhost:8000/metrics

# 使用 statsd（待集成）
```

### 3. 缓存管理

#### Redis 缓存

```bash
# 连接到 Redis
redis-cli

# 查看所有键
KEYS *

# 查看 Schema 缓存
KEYS schema:*

# 清除所有缓存
FLUSHDB

# 清除 Schema 缓存
KEYS schema:* | xargs DEL

# 查看缓存 TTL
TTL schema:<ds_id>

# 设置缓存 TTL（秒）
EXPIRE schema:<ds_id> 3600
```

#### ChromaDB 清理

```bash
# 删除指定用户的历史查询
# 在代码中调用 vector_store.clear_user_queries(user_id)

# 删除所有历史查询
# 在代码中调用 vector_store.delete_collection()
```

### 4. 数据库维护

#### MySQL 管理

```bash
# 连接到 MySQL
mysql -h localhost -u text2sql -p text2sql_admin

# 查看表
SHOW TABLES;

# 查看查询历史
SELECT * FROM query_histories ORDER BY created_at DESC LIMIT 10;

# 清理旧查询历史（30天前）
DELETE FROM query_histories WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

# 优化表
OPTIMIZE TABLE query_histories;
```

### 5. 备份与恢复

#### 数据库备份

```bash
# 备份管理数据库
mysqldump -h localhost -u text2sql -p text2sql_admin > backup_$(date +%Y%m%d).sql

# 备份所有数据库
mysqldump -h localhost -u root -p --all-databases > all_backup_$(date +%Y%m%d).sql
```

#### 恢复数据库

```bash
mysql -h localhost -u text2sql -p text2sql_admin < backup_20250115.sql
```

### 6. 依赖更新

```bash
# 查看可更新依赖
pip list --outdated

# 更新特定依赖
pip install --upgrade langchain

# 更新所有依赖
pip freeze > requirements.txt
```

### 7. 扩展部署

#### 水平扩展

```yaml
# docker-compose.yml
services:
  backend:
    # ...
    deploy:
      replicas: 3
```

#### 负载均衡

在 `nginx.conf` 中配置：

```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

---

## 故障排查

### 常见问题

#### 1. 启动失败

**症状**：`python main.py` 执行报错

**排查步骤**：

1. 检查 Python 版本：`python --version`（需要 3.8+）
2. 检查依赖安装：`pip list`
3. 检查端口占用：`lsof -i :8000`
4. 查看详细错误日志

**解决方案**：

```bash
# 确保 Python 版本正确
python3 --version

# 重新安装依赖
pip install -r requirements.txt

# 安装缺失的依赖
pip install <missing-package>

# 杀掉占用端口的进程
kill -9 $(lsof -t -i:8000)
```

#### 2. LLM 调用失败

**症状**：`Error communicating with LLM` 或超时

**排查步骤**：

1. 确认 API Key 配置正确
2. 检查网络连接
3. 查看后端日志中的详细错误

**解决方案**：

```bash
# 检查 API Key
echo $LLM_API_KEY

# 测试 API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'

# 检查网络代理
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

#### 3. 数据库连接失败

**症状**：`Can't connect to MySQL server` 或 `Connection refused`

**排查步骤**：

1. 确认 MySQL 服务运行中
2. 检查连接信息（主机、端口、用户名、密码）
3. 检查防火墙设置
4. 查看 MySQL 日志

**解决方案**：

```bash
# 检查 MySQL 状态
docker-compose ps mysql
# 或
systemctl status mysql

# 测试连接
mysql -h localhost -u text2sql -p -e "SHOW DATABASES;"

# 查看 MySQL 错误日志
docker-compose logs mysql
# 或
tail -n 100 /var/log/mysql/error.log

# 授权用户（如果需要）
docker-compose exec mysql mysql -uroot -p
CREATE USER 'text2sql'@'%' IDENTIFIED BY 'text2sql123';
GRANT ALL PRIVILEGES ON text2sql_admin.* TO 'text2sql'@'%';
FLUSH PRIVILEGES;
```

#### 4. Redis 连接失败

**症状**：`Connection refused` 或 `ECONNREFUSED`

**排查步骤**：

1. 确认 Redis 服务运行中
2. 检查配置的主机和端口
3. 测试连接

**解决方案**：

```bash
# 检查 Redis 状态
docker-compose ps redis
redis-cli ping

# 查看 Redis 日志
docker-compose logs redis

# 启动 Redis（如果未使用 Docker）
redis-server
```

#### 5. ChromaDB 连接失败

**症状**：`Connection refused` 或向量检索失败

**排查步骤**：

1. 确认 ChromaDB 服务运行中
2. 检查配置的主机和端口
3. 测试 API

**解决方案**：

```bash
# 检查 ChromaDB 状态
docker-compose ps chromadb

# 测试 ChromaDB API
curl http://localhost:8001/api/v1/heartbeat

# 查看 ChromaDB 日志
docker-compose logs chromadb
```

#### 6. 内存占用过高

**症状**：`MemoryError` 或系统变慢

**排查步骤**：

1. 检查 Python 进程内存占用
2. 查看日志中的内存警告
3. 检查数据量

**解决方案**：

```bash
# 查看进程内存占用
ps aux | grep python

# 优化方案
# 1. 增加 LIMIT 限制
# 2. 清理查询历史
# 3. 重启服务
docker-compose restart backend

# 4. 增加内存限制
docker-compose update --memory=2g backend
```

### 调试技巧

#### 1. 启用调试模式

在 `.env` 中设置：

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

#### 2. 使用 Python 调试器

```python
import pdb

def some_function():
    pdb.set_trace()
    # 调试代码
```

#### 3. 查看 FastAPI 请求日志

FastAPI 默认记录所有请求，可在 `main.py` 中配置详细日志。

#### 4. 数据库查询调试

```python
# 启用 SQLAlchemy 查询日志
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

---

## 依赖说明

| 依赖 | 用途 |
|------|------|
| fastapi / uvicorn | Web 框架和服务器 |
| sqlalchemy | ORM（管理数据库用 MySQL） |
| langchain | LLM 统一调用抽象 |
| langchain-chroma | ChromaDB 向量存储集成（预留） |
| chromadb | 向量数据库 |
| openai | OpenAI 兼容 API 客户端 |
| redis | Redis 客户端（缓存） |
| pydantic / pydantic-settings | 数据验证和配置管理 |
| python-jose | JWT 令牌签发与校验 |
| passlib + bcrypt | 密码哈希 |
| mysql-connector-python | MySQL 数据库驱动 |
| psycopg2-binary | PostgreSQL 数据库驱动 |
| sentence-transformers | 文本向量嵌入模型 |
| sqlglot | SQL 解析与格式化 |
| python-dotenv | 环境变量加载 |

---

## 许可证

MIT License

---

## 联系方式

- GitHub Issues：[项目 Issues]
- 技术讨论：[Discussions]
