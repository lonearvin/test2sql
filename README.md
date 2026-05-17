# Text-to-SQL 智能查询系统

> 一个基于自然语言的智能 SQL 查询系统，支持将人类语言转换为 SQL 查询语句。

## 项目概览

Text-to-SQL 是一个**智能问数系统**，用户可以用自然语言提出问题（如"上个月销售额最高的5个产品是什么？"），系统自动理解数据库结构，生成正确的 SQL 并执行，返回结构化查询结果。

### 核心能力

- **自然语言 → SQL**：将中文/英文问题转化为 MySQL/PostgreSQL 查询
- **Schema 智能解析**：自动提取 COMMENT / 主键 / 外键 / 样本数据，理解表和字段含义
- **RAG 检索增强**：历史成功查询的向量检索，增强 LLM 生成准确性
- **多轮对话**：支持上下文连续问答，理解代词和省略
- **多层安全**：SQL 关键词检测 + 结果 LIMIT + 敏感字段脱敏 + 用户数据隔离
- **语义层**：用户可为表和字段添加中文业务说明
- **多数据源**：支持 MySQL 和 PostgreSQL，按用户隔离管理

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| FastAPI | Web 框架 |
| Uvicorn | ASGI 服务器 |
| SQLAlchemy | ORM |
| Pydantic | 数据验证 |
| python-jose | JWT 认证 |
| LangChain | LLM 集成 |
| Redis | 缓存层 |
| ChromaDB | 向量数据库 |
| sentence-transformers | 文本向量化 |

### 前端

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| TailwindCSS 4 | 样式框架 |
| Framer Motion | 动画库 |
| Axios | HTTP 客户端 |
| Lucide React | 图标库 |

## 技术架构总览

```mermaid
graph TB
    subgraph Frontend["前端层 (React)"]
        UI1[登录/注册页]
        UI2[智能查询页]
        UI3[数据源管理页]
        UI4[设置页]
    end

    subgraph Backend["后端服务层 (FastAPI)"]
        subgraph API_Layer["API 层"]
            AuthAPI[/auth<br/>认证鉴权]
            UsersAPI[/users<br/>用户管理]
            DataSourcesAPI[/data-sources<br/>数据源管理]
            TextToSQLAPI[/text-to-sql<br/>核心查询引擎]
        end

        subgraph Service_Layer["Service 层"]
            SchemaService["SchemaService<br/>Schema 获取与缓存"]
            SecurityService["SecurityService<br/>SQL 安全校验"]
            TextToSQLService["TextToSQLService<br/>核心编排引擎"]
        end

        subgraph Infrastructure_Layer["Infrastructure 层"]
            RedisClient["RedisClient<br/>Schema 缓存"]
            LLMClient["LLMClient<br/>DeepSeek API"]
            DBConnector["DBConnector<br/>MySQL/PG 连接"]
            RAGService["RAGService<br/>向量检索增强"]
            VectorStore["VectorStore<br/>ChromaDB"]
        end
    end

    subgraph Data_Storage["数据存储层"]
        Redis[("Redis<br/>Schema 缓存<br/>TTL=3600s")]
        MySQL[("MySQL<br/>text2sql_admin<br/>管理库")]
        ChromaDB[("ChromaDB<br/>向量存储<br/>HNSW+Cosine")]
    end

    subgraph External["外部服务"]
        LLM_API["LLM API<br/>DeepSeek / OpenAI"]
        Target_DB["目标数据库<br/>MySQL / PostgreSQL"]
    end

    UI1 & UI2 & UI3 & UI4 -->|"HTTP REST API"| AuthAPI & UsersAPI & DataSourcesAPI & TextToSQLAPI

    AuthAPI & UsersAPI & DataSourcesAPI --> Service_Layer
    TextToSQLAPI --> TextToSQLService

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

## 前后端关系

### 前后端通信

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│  Frontend   │  ──────▶ │   Backend   │  ──────▶ │   Database  │
│  (React)    │ ◀──────── │  (FastAPI)   │ ◀──────── │   (MySQL)   │
└─────────────┘          └─────────────┘          └─────────────┘
     │                         │                        │
     │  HTTP/REST (JSON)      │  SQLAlchemy ORM        │
     │  Axios 拦截器           │  JWT 认证               │
     │  React Context         │  Pydantic 验证         │
     │  localStorage           │  Redis/向量存储         │
```

### 前端职责

- 用户界面渲染与交互
- 表单验证与用户体验优化
- JWT Token 管理（登录状态）
- API 请求封装与错误处理
- 响应式布局与动画效果
- 多轮对话状态管理

### 后端职责

- RESTful API 接口开发
- 业务逻辑编排与处理
- 数据库连接与查询执行
- LLM 集成与调用
- SQL 安全校验与防护
- 数据持久化与缓存管理
- 向量检索与 RAG 增强

### 数据流向

```
1. 用户在 Frontend 输入自然语言问题
   │
   ▼
2. Frontend 发送 POST /api/v1/text-to-sql/query
   │
   ▼
3. Backend 接收请求，JWT 验证身份
   │
   ▼
4. Backend 串联处理流程：
   ├── Schema 获取（Redis 缓存 / 目标数据库）
   ├── RAG 检索（ChromaDB 向量相似度）
   ├── LLM 生成 SQL（DeepSeek API）
   ├── SQL 安全校验
   ├── SQL 执行（MySQL/PostgreSQL）
   └── 结果脱敏与存储
   │
   ▼
5. Backend 返回 QueryResponse
   │
   ▼
6. Frontend 渲染查询结果
```

## 目录结构

```
text_to_sql/
│
├── backend/                         # 后端服务
│   ├── main.py                      # 应用入口
│   ├── requirements.txt             # Python 依赖
│   ├── Dockerfile                   # Docker 镜像
│   ├── docker-compose.yml           # Docker 编排
│   │
│   └── app/                         # 应用主目录
│       ├── config/                  # 配置管理
│       │   └── settings.py         # pydantic-settings
│       │
│       ├── models/                  # 数据模型
│       │   └── database.py         # SQLAlchemy ORM
│       │
│       ├── schemas/                 # Pydantic Schema
│       │   ├── auth.py
│       │   ├── user.py
│       │   ├── data_source.py
│       │   ├── text_to_sql.py
│       │   └── semantic.py
│       │
│       ├── db/                      # 数据库会话
│       │   └── session.py
│       │
│       ├── api/v1/                  # API 路由
│       │   ├── api.py              # 路由注册
│       │   └── endpoints/
│       │       ├── auth.py         # 认证接口
│       │       ├── users.py        # 用户接口
│       │       ├── data_sources.py  # 数据源接口
│       │       └── text_to_sql.py  # 查询接口
│       │
│       ├── services/                # 业务逻辑
│       │   ├── text_to_sql_service.py
│       │   ├── schema_service.py
│       │   └── security_service.py
│       │
│       └── infrastructure/          # 基础设施
│           ├── llm_client.py        # LLM 调用
│           ├── database_connector.py # 数据库连接
│           ├── redis_client.py      # Redis 缓存
│           ├── vector_store.py      # 向量存储
│           └── rag_service.py       # RAG 服务
│
├── frontend/                        # 前端应用
│   ├── src/
│   │   ├── api/                    # API 封装
│   │   │   └── index.ts
│   │   │
│   │   ├── components/             # UI 组件
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       └── Input.tsx
│   │   │
│   │   ├── context/                # 状态管理
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── pages/                  # 页面组件
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DatasourcePage.tsx
│   │   │   ├── QueryPage.tsx
│   │   │   └── PageComponents.tsx
│   │   │
│   │   ├── types/                  # 类型定义
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx                # 应用入口
│   │   ├── main.tsx              # React 渲染
│   │   └── index.css             # 全局样式
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── README.md                        # 本文件
├── docker-compose.yml               # 项目级 Docker 编排
└── init.sql                        # 数据库初始化脚本
```

### 前后端交互数据流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端 (React)
    participant API as API 网关
    participant Backend as 后端 (FastAPI)
    participant Service as Service 层
    participant LLM as LLM API
    participant Cache as Redis
    participant Vector as ChromaDB
    participant DB as MySQL

    User->>Frontend: 1. 输入自然语言问题
    Frontend->>API: 2. POST /api/v1/text-to-sql/query
    API->>Backend: 3. 转发请求
    Backend->>Service: 4. generate_and_execute()

    Service->>Cache: 5. 获取 Schema
    alt 缓存命中
        Cache-->>Service: 返回缓存
    else 缓存未命中
        Service->>DB: 连接数据库
        DB-->>Service: 返回表结构
        Service->>Cache: 写入缓存
    end

    Service->>Vector: 6. RAG 检索
    Vector-->>Service: 返回相似查询

    Service->>LLM: 7. LLM 生成 SQL
    LLM-->>Service: 返回 SQL

    Service->>Service: 8. 安全校验
    Service->>DB: 9. 执行 SQL
    DB-->>Service: 返回结果

    Service->>Service: 10. 结果脱敏
    Service->>Vector: 11. 存储查询历史
    Service-->>Backend: 返回结果
    Backend-->>API: 返回响应
    API-->>Frontend: 返回 QueryResponse
    Frontend-->>User: 展示结果
```

### 核心查询流程

```mermaid
flowchart LR
    subgraph Input["📥 输入"]
        Question[自然语言问题]
    end

    subgraph Process["⚙️ 处理流程"]
        Auth[鉴权验证]
        Schema[Schema 获取]
        RAG[RAG 检索]
        LLM[LLM 生成]
        Security[安全校验]
        Execute[SQL 执行]
        Mask[结果脱敏]
    end

    subgraph Output["📤 输出"]
        Result[查询结果]
        History[历史记录]
    end

    Question --> Auth
    Auth --> Schema
    Schema --> RAG
    RAG --> LLM
    LLM --> Security
    Security --> Execute
    Execute --> Mask
    Mask --> Result
    Mask --> History

    style Input fill:#e1f5fe,color:#01579b
    style Process fill:#f3e5f5,color:#4a148c
    style Output fill:#e8f5e9,color:#1b5e20
```

## 环境配置

### 前置条件

- Python 3.8+
- Node.js 18+
- Docker & Docker Compose（可选）
- Redis（可选，用于 Schema 缓存）
- MySQL 或 PostgreSQL

### 环境变量配置

#### 后端 (.env)

```env
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
REDIS_PASSWORD=

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

#### 前端 (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
cd text_to_sql

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

访问 `http://localhost:5173`

### 方式二：本地开发

#### 1. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

#### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 3. 访问应用

打开浏览器访问 `http://localhost:5173`

## 项目文档

- [后端详细文档](./backend/README.md)
- [后端架构文档](./backend/ARCHITECTURE.md)
- [前端详细文档](./frontend/README.md)

## 整体开发流程

### 1. 需求分析

```
用户需求 → 场景分析 → 功能设计 → 数据建模
```

### 2. 后端开发

```
API 设计 → Schema 定义 → Service 编写 → 基础设施集成 → 单元测试
```

### 3. 前端开发

```
UI 设计 → 组件开发 → 页面集成 → 状态管理 → 交互优化
```

### 4. 集成测试

```
前后端联调 → 端到端测试 → 性能测试 → 安全测试
```

### 5. 部署上线

```
容器化 → 环境配置 → 监控告警 → 持续部署
```

## 贡献指南

### 开发规范

#### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

示例：
```bash
git commit -m "feat: 添加数据源连接测试功能"
git commit -m "fix: 修复登录 401 错误"
git commit -m "docs: 更新 API 文档"
```

#### 代码审查

- 所有 Pull Request 需要代码审查
- 确保通过 CI/CD 流水线
- 保持代码风格一致

### 报告问题

- 使用 GitHub Issues
- 提供详细的问题描述
- 附上相关日志和截图
- 说明复现步骤

## 部署架构

```
                         ┌─────────────────────────────┐
                         │      Internet                │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │      Nginx / CDN             │
                         │      负载均衡 / 静态资源      │
                         └──────────────┬──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │   Frontend 1    │ │   Frontend 2   │ │   Frontend N    │
          │   (Vite Dev)   │ │  (Vite Prod)  │ │  (容器化)       │
          │  localhost:5173│ │   静态托管     │ │                │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │      API Gateway             │
                         │      (Nginx/云网关)          │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │      Backend Cluster         │
                         │      (多实例部署)            │
                         └──────────────┬──────────────┘
                                        │
          ┌─────────────────┬──────────┴──────────┬─────────────────┐
          │                 │                     │                 │
          ▼                 ▼                     ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Redis       │ │    ChromaDB     │ │     MySQL      │ │   DeepSeek API  │
│   (缓存集群)     │ │  (向量集群)      │ │  (主从集群)     │ │   (外部服务)     │
│  text2sql-cache │ │  text2sql-vec  │ │  text2sql-data │ │                │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 常见问题

### Q1: 启动失败怎么办？

1. 检查端口占用：`lsof -i :8000` 或 `lsof -i :5173`
2. 检查依赖安装：`pip list` 或 `npm list`
3. 查看日志输出，定位具体错误

### Q2: LLM 调用失败？

1. 确认 API Key 配置正确
2. 检查网络连接
3. 查看后端日志中的详细错误信息

### Q3: 数据库连接失败？

1. 确认 MySQL 服务运行中
2. 检查用户名密码配置
3. 确认数据库已创建

### Q4: 如何清除缓存？

```bash
# Redis 缓存
redis-cli FLUSHDB

# 前端缓存
rm -rf node_modules/.vite
```

## 许可证

MIT License

## 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[GitHub Issues]
- 技术讨论：[GitHub Discussions]
