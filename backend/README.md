# Text-to-SQL Service

基于 FastAPI 的智能 Text-to-SQL 服务，支持自然语言转 SQL 查询，集成了 RAG（检索增强生成）流程。

## 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    http://localhost:5173                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (FastAPI)                         │
│                    http://localhost:8000                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    /api/v1                               │   │
│  │  ├── /auth        - 用户认证 (登录/注册)                   │   │
│  │  ├── /users       - 用户管理                              │   │
│  │  ├── /data-sources - 数据源管理                           │   │
│  │  └── /text-to-sql - SQL生成与执行                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      Services Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ SchemaService   │  │ SecurityService │  │ TextToSQLService│  │
│  │ - 获取表结构     │  │ - SQL安全校验   │  │ - 生成SQL      │  │
│  │ - 缓存管理      │  │ - 敏感字段处理   │  │ - RAG流程      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                  Infrastructure Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  RedisClient    │  │   LLMClient     │  │DatabaseConnector │  │
│  │  - Schema缓存   │  │  - DeepSeek    │  │  - MySQL/PG     │  │
│  │  - 结果缓存     │  │  - SQL生成     │  │  - 连接测试     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ VectorStore     │  │  RAGService     │                       │
│  │  - ChromaDB    │  │  - 向量检索     │                       │
│  │  - 相似查询    │  │  - Prompt增强   │                       │
│  └─────────────────┘  └─────────────────┘                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   SQLite DB     │ │     Redis       │ │     ChromaDB     │
│  (用户/数据源)   │ │   (Schema缓存)  │ │  (向量存储)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   LLM Service   │
                    │   (DeepSeek)    │
                    └─────────────────┘
```

### 核心模块

#### 1. API 层 (`app/api/v1/endpoints/`)

| 模块 | 路径 | 功能 |
|------|------|------|
| `auth.py` | `/api/v1/auth` | 用户认证 (登录/注册/JWT) |
| `users.py` | `/api/v1/users` | 用户管理 (CRUD) |
| `data_sources.py` | `/api/v1/data-sources` | 数据源管理 (连接/测试/表) |
| `text_to_sql.py` | `/api/v1/text-to-sql` | SQL生成与执行 |

#### 2. Services 层 (`app/services/`)

| 服务 | 功能 |
|------|------|
| `SchemaService` | 获取数据库Schema，支持Redis缓存 |
| `SecurityService` | SQL安全校验，敏感字段处理 |
| `TextToSQLService` | 核心服务，协调各组件完成查询，集成RAG |

#### 3. Infrastructure 层 (`app/infrastructure/`)

| 组件 | 功能 |
|------|------|
| `RedisClient` | Redis连接和Schema缓存操作 |
| `LLMClient` | LLM API调用 (DeepSeek)，支持RAG增强 |
| `DatabaseConnector` | 数据库连接和SQL执行 |
| `VectorStore` | ChromaDB向量数据库，存储历史查询向量 |
| `RAGService` | 检索增强生成，相似查询检索和Prompt构建 |

## RAG 流程

### 向量数据库架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG (检索增强生成) 流程                        │
└─────────────────────────────────────────────────────────────────┘

用户问题 ──► 向量嵌入 ──► ChromaDB相似搜索 ──► 增强Prompt ──► LLM ──► SQL
     │                                    ▲
     │                                    │
     ▼                                    │
存储查询向量 ──► ChromaDB ◄──────────────┘
     │
     ▼
成功查询 ──► 历史记录
```

### ChromaDB 向量存储

```
Collection: query_history

Document Structure:
{
  "id": "query_uuid",
  "content": "问题: 有多少用户？\nSQL: SELECT COUNT(*) FROM users",
  "metadata": {
    "question": "有多少用户？",
    "sql": "SELECT COUNT(*) FROM users",
    "data_source_id": "ds_uuid",
    "user_id": "user_uuid"
  },
  "embedding": [0.123, -0.456, ...] (384维)
}

Index: hnsw (近似最近邻)
Similarity: cosine (余弦相似度)
```

### RAG 检索流程

1. **问题输入**: 用户输入自然语言问题
2. **向量编码**: 使用 Sentence-Transformers 将问题转为向量
3. **相似搜索**: 在ChromaDB中搜索最相似的历史查询
4. **Prompt增强**: 将相似查询加入Prompt上下文
5. **SQL生成**: LLM基于增强的Prompt生成SQL

### 相似度过滤

- **相似度阈值**: 0.7 (70%)
- **返回数量**: 默认3条
- **数据源隔离**: 优先返回同一数据源的历史查询

## 业务流程

### Text-to-SQL 查询流程 (含RAG)

```
┌──────────────────────────────────────────────────────────────────┐
│                     Text-to-SQL 查询流程                          │
└──────────────────────────────────────────────────────────────────┘

1. 用户输入自然语言问题
          │
          ▼
2. TextToSQLService.generate_and_execute()
          │
          ▼
3. SchemaService.get_schema() ──► Redis缓存/数据库
          │
          ▼
4. RAGService.retrieve_similar_queries()
          │
          ▼
5. VectorStore.search_similar_queries()
          │
          ▼
6. ChromaDB向量相似度搜索
          │
          ▼
7. 筛选相似度 >= 0.7 的历史查询
          │
          ▼
8. LLMClient.generate_sql_with_rag()
          │
          ▼
9. SecurityService.validate_sql()
          │
          ▼
10. SecurityService.sanitize_sql() (添加LIMIT)
          │
          ▼
11. DatabaseConnector.execute_sql()
          │
          ▼
12. 保存结果到SQLite + ChromaDB
          │
          ▼
13. 返回QueryResponse
```

### SQL 安全校验流程

```
┌──────────────────────────────────────────────────────────────────┐
│                     SQL 安全校验流程                               │
└──────────────────────────────────────────────────────────────────┘

1. 接收生成的SQL
          │
          ▼
2. {检查首token}
          │
          ├── 非SELECT ──> 拒绝执行
          │
          ▼
3. 扫描禁止关键字 (DROP/DELETE/TRUNCATE等)
          │
          ▼
4. {含敏感关键字?} ──是──> 拒绝执行
          │
          否
          ▼
5. 扫描敏感字段 (password/token等)
          │
          ▼
6. {含敏感字段?} ──是──> 结果脱敏
          │
          否
          ▼
7. {检查LIMIT子句}
          │
          ├── 无LIMIT ──> 自动添加 LIMIT 1000
          │
          ▼
8. SQL校验通过
```

## 项目结构

```
backend/
├── main.py                    # FastAPI应用入口
├── requirements.txt            # 依赖列表
├── Dockerfile                  # Docker镜像配置
├── .env                       # 环境变量
│
└── app/
    ├── __init__.py
    │
    ├── config/
    │   ├── __init__.py
    │   └── settings.py        # 配置管理 (pydantic-settings)
    │
    ├── models/
    │   ├── __init__.py
    │   └── database.py       # SQLAlchemy模型
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── auth.py           # 认证Schema
    │   ├── user.py           # 用户Schema
    │   ├── data_source.py    # 数据源Schema
    │   └── text_to_sql.py    # 查询Schema
    │
    ├── infrastructure/
    │   ├── __init__.py
    │   ├── redis_client.py   # Redis客户端
    │   ├── llm_client.py     # LLM客户端 (支持RAG)
    │   ├── database_connector.py # 数据库连接器
    │   ├── vector_store.py   # ChromaDB向量存储
    │   └── rag_service.py    # RAG服务
    │
    ├── services/
    │   ├── __init__.py
    │   ├── schema_service.py      # Schema服务
    │   ├── security_service.py    # 安全服务
    │   └── text_to_sql_service.py # 核心服务 (集成RAG)
    │
    ├── api/
    │   └── v1/
    │       ├── __init__.py
    │       ├── api.py       # 路由汇总
    │       └── endpoints/
    │           ├── __init__.py
    │           ├── auth.py
    │           ├── users.py
    │           ├── data_sources.py
    │           └── text_to_sql.py
    │
    └── db/
        ├── __init__.py
        └── session.py        # 数据库会话
```

## API 接口文档

### Text-to-SQL 接口

#### POST `/api/v1/text-to-sql/query` - 执行查询
```json
Request:
{
  "data_source_id": "uuid",
  "question": "有多少个用户？"
}

Response:
{
  "id": "uuid",
  "sql": "SELECT COUNT(*) FROM users",
  "results": [{"COUNT(*)": 100}],
  "status": "success",
  "error_message": null
}
```

#### GET `/api/v1/text-to-sql/history` - 查询历史
```
Query params: data_source_id (可选)

Response: List[QueryHistoryResponse]
```

#### GET `/api/v1/text-to-sql/similar` - 获取相似查询
```
Query params:
  - question: 当前问题
  - data_source_id: 数据源ID (可选)
  - limit: 返回数量 (默认5)

Response:
{
  "similar_queries": [
    {
      "id": "uuid",
      "question": "有多少用户？",
      "sql": "SELECT COUNT(*) FROM users",
      "similarity_score": 0.95
    }
  ]
}
```

## 缓存策略

### 多层缓存架构

| 缓存类型 | 存储内容 | TTL | 技术 |
|---------|---------|-----|------|
| Schema缓存 | 数据库表结构 | 1小时 | Redis |
| 查询结果缓存 | SQL执行结果 | 10分钟 | Redis |
| 向量存储 | 历史查询向量 | 永久 | ChromaDB |

### ChromaDB 配置

```python
Collection: query_history
Embedding: all-MiniLM-L6-v2 (384维)
Index: hnsw
Similarity: cosine
Persist Directory: ./data/vector_db
```

## 安全机制

1. **密码加密**: 使用 bcrypt 哈希
2. **JWT认证**: Token过期时间30分钟
3. **用户隔离**: 用户只能访问自己的数据源
4. **SQL白名单**: 只允许SELECT查询
5. **禁止关键字**: DROP/DELETE/TRUNCATE等
6. **LIMIT限制**: 最大返回1000条
7. **敏感字段**: password等字段自动脱敏
8. **向量隔离**: 用户只能检索自己的历史查询

## 环境变量

```env
# 服务配置
APP_NAME=text2sql-service
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true

# LLM配置
LLM_API_KEY=your-deepseek-api-key
LLM_API_BASE=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.1

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# ChromaDB配置 (向量数据库)
VECTOR_DB_PATH=./data/vector_db

# 数据库配置
ADMIN_DB_URL=sqlite:///./text2sql_admin.db

# JWT配置
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 安全配置
SENSITIVE_FIELDS=password,token,secret,salt
MAX_RESULTS=1000
```

## Docker 部署

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

### 单独构建

```bash
# 构建镜像
docker build -t text2sql-backend ./backend

# 运行容器
docker run -d -p 8000:8000 \
  -e LLM_API_KEY=your-api-key \
  text2sql-backend
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入配置
```

### 3. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8000` 启动

### 4. 访问API文档

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 技术栈

| 技术 | 用途 |
|------|------|
| FastAPI | Web框架 |
| SQLAlchemy | ORM |
| Pydantic | 数据验证 |
| python-jose | JWT认证 |
| LangChain | LLM集成 |
| ChromaDB | 向量数据库 |
| Sentence-Transformers | 文本向量化 |
| Redis | 缓存 |
| MySQL/PostgreSQL | 用户数据库 |

## License

MIT