# Text-to-SQL 后端服务

基于 FastAPI 的智能 Text-to-SQL 服务，支持自然语言转 SQL 查询，集成 RAG（检索增强生成）、多轮对话、多层安全防护。

---

## 目录

- [系统架构](#系统架构)
- [分层设计](#分层设计)
- [核心流程](#核心流程)
- [项目结构](#项目结构)
- [API 接口文档](#api-接口文档)
- [数据模型](#数据模型)
- [配置说明](#配置说明)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [安全机制](#安全机制)

---

## 系统架构

```
                                ┌──────────────────────────────┐
                                │       Frontend (React)        │
                                │      http://localhost:5173     │
                                └──────────────┬───────────────┘
                                               │ HTTP REST
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                 │
│                     FastAPI + Uvicorn                               │
│                   http://localhost:8000                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        /api/v1                               │   │
│  │  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐ │   │
│  │  │   /auth   │ │  /users   │ │ /data-sources │ │/text-to- │ │   │
│  │  │  认证鉴权  │ │  用户管理  │ │   数据源管理   │ │   sql    │ │   │
│  │  └───────────┘ └───────────┘ └──────────────┘ └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Service Layer   │ │  Service Layer   │ │  Service Layer   │
│  SchemaService   │ │ SecurityService  │ │TextToSQLService  │
│  ─────────────── │ │ ───────────────  │ │ ───────────────  │
│  • 表结构获取     │ │  • SQL关键词校验 │ │  • 核心编排逻辑   │
│  • Redis 缓存    │ │  • 敏感字段检测   │ │  • 多轮对话支持   │
│                  │ │  • 结果脱敏处理   │ │  • RAG 流程集成  │
└───────┬──────────┘ └──────────────────┘ └────────┬─────────┘
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                               │
│                                                                       │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │RedisClient │ │ LLMClient  │ │DBConnector   │ │ RAGService    │  │
│  │─────────── │ │─────────── │ │──────────────│ │───────────────│  │
│  │ Schema缓存  │ │ LangChain  │ │ MySQL/PG     │ │ 相似查询检索   │  │
│  │ JSON存取   │ │ DeepSeek   │ │ 连接测试     │ │ Prompt增强    │  │
│  └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ └───────┬───────┘  │
│        │              │               │                 │           │
│  ┌─────┴──────────────┴───────────────┴─────────────────┴──────┐    │
│  │                    VectorStore (ChromaDB)                    │    │
│  │  ────────────────────────────────────────────────────────────│    │
│  │  • 历史查询向量化存储  • 余弦相似度检索  • HNSW 索引          │    │
│  └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    SQLite        │ │     Redis        │ │    ChromaDB      │
│  (text2sql_admin │ │  (缓存层)        │ │  (向量存储)       │
│     .db)         │ │  ─────────────── │ │  ───────────────  │
│  ─────────────── │ │  Schema 缓存     │ │  查询向量索引     │
│  用户 / 数据源    │ │  1 小时 TTL      │ │  相似度计算       │
│  查询历史         │ │                  │ │                   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │   External Services  │
                    │   ───────────────    │
                    │   DeepSeek API       │
                    │   MySQL / PostgreSQL │
                    └──────────────────────┘
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
├── .env                             # 环境变量（API Key、数据库地址等）
├── text2sql_admin.db                # SQLite 管理数据库（自动生成）
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
    │   └── text_to_sql.py           # QueryRequest, QueryResponse, QueryHistoryResponse
    │
    ├── db/                          # 数据库会话
    │   └── session.py               # SQLAlchemy engine 创建、Session 工厂、建表
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

### 查询接口 `/api/v1/text-to-sql`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/query` | 自然语言查询 → 生成 SQL → 执行 | 是 |
| GET | `/history` | 查询历史列表（支持按数据源过滤） | 是 |
| GET | `/history/{id}` | 查询历史详情 | 是 |
| DELETE | `/history/{id}` | 删除查询历史 | 是 |
| GET | `/similar` | 获取相似历史查询 | 是 |

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
| `admin_db_url` | `sqlite:///./text2sql_admin.db` | 管理数据库 URL |
| `secret_key` | - | JWT 签名密钥 |
| `algorithm` | `HS256` | JWT 算法 |
| `access_token_expire_minutes` | `30` | Token 有效期（分钟） |
| `sensitive_fields` | `password,token,secret,salt` | 需脱敏的字段 |
| `max_results` | `1000` | 查询结果最大行数 |

---

## 快速开始

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

```bash
cp .env.example .env    # 如果有模板文件
# 编辑 .env，至少配置：
#   LLM_API_KEY=your-key
#   LLM_API_BASE=https://api.deepseek.com/v1
#   LLM_MODEL=deepseek-chat
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

### 5. 启动服务

```bash
python main.py
```

服务启动后自动创建 SQLite 管理数据库，访问 `http://localhost:8000/docs` 查看 API 文档。

---

## Docker 部署

使用 `docker-compose` 一键启动完整环境（后端 + Redis + ChromaDB + MySQL）：

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
| mysql | 3306 | 示例 MySQL 数据库（含测试数据） |

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

---

## 依赖说明

| 依赖 | 用途 |
|------|------|
| fastapi / uvicorn | Web 框架和服务器 |
| sqlalchemy | ORM（管理数据库用 SQLite） |
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
