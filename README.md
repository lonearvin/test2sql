# Text-to-SQL 智能查询系统

一个基于自然语言的智能 SQL 查询系统，支持将人类语言转换为 SQL 查询语句。

## 项目概览

```
text_to_sql/
├── backend/                    # 后端服务 (Python/FastAPI)
│   ├── main.py                 # 应用入口
│   ├── app/
│   │   ├── api/v1/endpoints/  # API端点
│   │   ├── config/            # 配置
│   │   ├── db/                # 数据库会话
│   │   ├── models/            # 数据模型
│   │   └── schemas/            # Pydantic Schema
│   └── README.md              # 后端详细文档
│
└── frontend/                   # 前端应用 (React/TypeScript)
    ├── src/
    │   ├── api/                # API接口
    │   ├── components/         # UI组件
    │   ├── context/            # React Context
    │   ├── pages/              # 页面
    │   └── types/              # TypeScript类型
    └── README.md               # 前端详细文档
```

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│                    localhost:5173                            │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│                    localhost:8000                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/v1/auth        - 用户认证                       │   │
│  │  /api/v1/users       - 用户管理                       │   │
│  │  /api/v1/data-sources - 数据源管理                     │   │
│  │  /api/v1/text-to-sql - SQL查询                        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌─────────┐           ┌─────────┐            ┌─────────────┐
│ SQLite  │           │  Redis  │            │ LLM Service │
│ (元数据) │           │ (缓存)   │            │ (DeepSeek)  │
└─────────┘           └─────────┘            └─────────────┘
```

## 技术栈

### 后端
| 技术 | 用途 |
|------|------|
| FastAPI | Web框架 |
| SQLAlchemy | ORM |
| Pydantic | 数据验证 |
| python-jose | JWT认证 |
| LangChain | LLM集成 |
| Redis | 缓存层 |

### 前端
| 技术 | 用途 |
|------|------|
| React 19 | UI框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| TailwindCSS 4 | 样式 |
| Framer Motion | 动画 |
| Lucide React | 图标 |

## 功能特性

### ✅ 已实现
- [x] 用户注册/登录 (JWT认证)
- [x] 数据源管理 (MySQL/PostgreSQL)
- [x] 数据表浏览与选择
- [x] 自然语言转SQL查询
- [x] 查询结果展示
- [x] 查询历史记录
- [x] Schema缓存优化
- [x] 响应式UI设计

## 快速开始

### 前置条件

- Python 3.8+
- Node.js 18+
- Redis (可选，用于缓存)
- MySQL 或 PostgreSQL

### 1. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 启动服务
python main.py
```

后端服务运行在 `http://localhost:8000`

### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务运行在 `http://localhost:5173`

### 3. 访问应用

打开浏览器访问 `http://localhost:5173`

## API 文档

启动后端后，访问自动生成的API文档：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 环境变量配置

### 后端 (.env)

```env
# LLM配置 (必需)
LLM_API_KEY=your-deepseek-api-key
LLM_API_BASE=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# Redis配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
SECRET_KEY=your-secret-key-change-in-production
```

### 前端 (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 项目文档

- [后端详细文档](./backend/README.md)
- [前端详细文档](./frontend/README.md)

## 使用流程

1. **注册/登录账号**
2. **添加数据源** - 配置MySQL或PostgreSQL连接
3. **选择数据表** - 从数据源中选择需要查询的表
4. **输入自然语言** - 如"有多少个用户？"
5. **获取SQL结果** - 系统生成SQL并返回查询结果

## License

MIT