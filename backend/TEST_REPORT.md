# Text-to-SQL 集成测试报告

**测试日期**: 2026-05-17  
**测试环境**: Docker (MySQL 8.0 + Redis 7 + ChromaDB) + 本地 Python 3.8  
**测试方法**: 自动化集成测试脚本 (`test_integration.py`)  
**后端地址**: http://localhost:8000  

---

## 一、测试概要

| 指标 | 数值 |
|------|------|
| 测试用例总数 | 50 |
| 通过数 | 50 |
| 失败数 | 0 |
| **通过率** | **100%** |
| 前端 TypeScript 编译 | ✅ 零错误 |
| 后端语法检查 | ✅ 全部通过 |

---

## 二、环境状态

| 服务 | 端口 | 状态 |
|------|------|------|
| Docker MySQL (text2sql_admin) | 3306 | ✅ Running |
| Docker MySQL (text2sql_demo) | 3306 | ✅ Running |
| Redis | 6379 | ✅ Running |
| ChromaDB | 8001 (容器内8000) | ✅ Connected |
| FastAPI Backend | 8000 | ✅ Running |
| Frontend (tsc --noEmit) | - | ✅ 编译通过 |

---

## 三、模块测试详情

### 3.1 健康检查 (2 项)

| # | 用例 | 结果 |
|---|------|------|
| 1 | GET /health 返回 200 | ✅ |
| 2 | 响应体 status=healthy | ✅ |

---

### 3.2 认证模块 (9 项)

| # | 用例 | 结果 |
|---|------|------|
| 3 | POST /auth/register 注册新用户 | ✅ |
| 4 | POST /auth/register 重复用户名拒绝 (400) | ✅ |
| 5 | POST /auth/login 登录成功 | ✅ |
| 6 | 返回 access_token 非空 | ✅ |
| 7 | 返回 token_type=bearer | ✅ |
| 8 | POST /auth/login 错误密码拒绝 (401) | ✅ |
| 9 | GET /auth/me 获取当前用户 | ✅ |
| 10 | 响应 username 正确 | ✅ |
| 11 | GET /auth/me 无 Token 拒绝 (401) | ✅ |

---

### 3.3 数据源管理 (8 项)

| # | 用例 | 结果 |
|---|------|------|
| 12 | POST /data-sources 创建数据源 (自测连接) | ✅ |
| 13 | POST /data-sources 错误连接拒绝 (400) | ✅ |
| 14 | GET /data-sources 获取列表 | ✅ |
| 15 | GET /data-sources/{id} 获取详情 | ✅ |
| 16 | GET /data-sources/{id}/all-tables 浏览所有表 | ✅ |
| 17 | 返回 5 张业务表 (categories, order_items, orders, products, users) | ✅ |
| 18 | POST /data-sources/{id}/tables 选择 5 张表 | ✅ |
| 19 | GET /data-sources/{id}/selected-tables 验证已选表 | ✅ |

---

### 3.4 语义层 API (8 项)

| # | 用例 | 结果 |
|---|------|------|
| 20 | POST /semantic/tables 创建表描述 (orders) | ✅ |
| 21 | GET /semantic/tables 获取表描述列表 | ✅ |
| 22 | POST /semantic/fields 创建字段描述 (status) | ✅ |
| 23 | POST /semantic/fields 创建第二个字段描述 (total_amount) | ✅ |
| 24 | GET /semantic/fields?table_name=orders 获取字段列表 | ✅ |
| 25 | PUT /semantic/fields/{id} 更新字段描述 | ✅ |
| 26 | POST /semantic/import 批量导入 (products 表 + 2字段) | ✅ |
| 27 | GET /semantic/export 导出 2 张表的语义 | ✅ |

---

### 3.5 核心 Text-to-SQL 查询 (7 项)

| # | 用例 | 预期 | 结果 |
|---|------|------|------|
| 28 | POST /query "总共有多少个用户？" | 返回统计结果 | ✅ |
| 29 | status=success | success | ✅ |
| 30 | sql 非空 | 有效 SQL | ✅ |
| 31 | results 为数组 | 非空列表 | ✅ |
| 32 | POST /query 聚合查询 "产品数和均价" | 返回正确统计 | ✅ |
| 33 | 多轮对话第一轮 "查询iPhone" | 返回结果 + 历史 | ✅ |
| 34 | 多轮对话第二轮 "最贵的" (带上下文) | 正确引用上文 | ✅ |

**LLM 生成的 SQL 示例**:
- `SELECT COUNT(*) AS count FROM users` — 正确
- `SELECT COUNT(*) AS count, AVG(price) AS avg_price FROM products` — 正确
- `SELECT * FROM products WHERE name LIKE '%iPhone%' LIMIT 1000` — 正确

---

### 3.6 查询历史与相似查询 (3 项)

| # | 用例 | 结果 |
|---|------|------|
| 35 | GET /text-to-sql/history 历史列表 | ✅ |
| 36 | GET /text-to-sql/history/{id} 历史详情 | ✅ |
| 37 | GET /text-to-sql/similar?question=... 相似查询 | ✅ |

---

### 3.7 安全机制 (5 项)

| # | 用例 | 结果 |
|---|------|------|
| 38 | POST /query 未认证请求拒绝 (401) | ✅ |
| 39 | 用户隔离: user2 访问 user1 的数据源拒绝 (400) | ✅ |
| 40 | DELETE /history/{id} 成功删除 | ✅ |
| 41 | PUT /data-sources/{id} 更新名称和描述 | ✅ |
| 42 | DELETE /semantic/fields/{id} 删除字段描述 | ✅ |

---

### 3.8 级联删除 (3 项)

| # | 用例 | 结果 |
|---|------|------|
| 43 | DELETE /semantic/tables/orders 级联删除 (表+关联字段) | ✅ |
| 44 | DELETE /data-sources/{id} 级联删除 (查询历史+已选表+语义) | ✅ |
| 45 | GET /data-sources/{id} 确认已删除 (404) | ✅ |

---

### 3.9 权限控制 (1 项)

| # | 用例 | 结果 |
|---|------|------|
| 46 | GET /users testuser (非admin) 被拒绝 (403) | ✅ |

---

### 3.10 API 文档 (2 项)

| # | 用例 | 结果 |
|---|------|------|
| 47 | GET /docs Swagger UI 可访问 | ✅ |
| 48 | GET /openapi.json OpenAPI 规范可获取 | ✅ |

---

### 3.11 前端验证 (2 项)

| # | 用例 | 结果 |
|---|------|------|
| 49 | npm install (55 packages) | ✅ |
| 50 | tsc --noEmit TypeScript 编译 | ✅ 零错误 |

---

## 四、测试中发现的问题及修复

### 问题 1: 数据源删除因外键约束失败

- **严重程度**: 🔴 高
- **现象**: DELETE /data-sources/{id} 返回 500，报 `Cannot delete or update a parent row: a foreign key constraint fails (query_histories)`
- **根因**: `QueryHistory.data_source_id` 和 `QueryHistory.user_id` 外键缺少 `ondelete="CASCADE"`
- **修复**: 
  1. [database.py](file:///Users/al/project-main/text_to_sql/backend/app/models/database.py#L64-L65) — 添加 `ondelete="CASCADE"` 到两处 ForeignKey
  2. [data_sources.py](file:///Users/al/project-main/text_to_sql/backend/app/api/v1/endpoints/data_sources.py#L131) — 删除数据源前显式删除关联的 QueryHistory
  3. [data_sources.py](file:///Users/al/project-main/text_to_sql/backend/app/api/v1/endpoints/data_sources.py#L5) — 补充 `QueryHistory` 导入
- **状态**: ✅ 已修复并验证

### 问题 2: MySQL 管理库未自动创建

- **严重程度**: 🟡 中
- **现象**: 首次启动后端时报 `Access denied for user 'text2sql'@'%' to database 'text2sql_admin'`
- **根因**: Docker MySQL 容器初始化时只创建了 `text2sql_demo`，未创建 `text2sql_admin`。`Base.metadata.create_all()` 只能建表不能建库
- **修复**: 在 `init.sql` 中已添加 `CREATE DATABASE IF NOT EXISTS text2sql_admin`，新版 docker-compose up 会生效
- **状态**: ✅ 已修复，手动 `CREATE DATABASE + GRANT` 验证通过

### 问题 3: 环境中 Python 版本不一致

- **严重程度**: 🟡 中
- **现象**: 系统有 Python 3.8/3.9/3.11 多个版本，pip 安装的包在错误版本中
- **影响**: 开发体验，不影响 Docker 部署
- **状态**: ⚠️ 已知，使用完整路径 `/Library/Frameworks/Python.framework/Versions/3.8/bin/python3.8` 解决

---

## 五、性能表现

| 指标 | 数值 | 说明 |
|------|------|------|
| 健康检查响应时间 | <10ms | 极快 |
| 注册/登录 | <50ms | 正常 |
| Schema 获取 (首次) | ~100ms | 含连接 MySQL + 5表提取 |
| Schema 获取 (缓存) | <5ms | Redis 命中 |
| LLM SQL 生成 | ~2-5s | 取决于 DeepSeek API |
| SQL 执行 | <50ms | 本地 MySQL |

---

## 六、结论

系统所有核心功能模块测试通过，包括：
- ✅ 用户注册/登录/鉴权（JWT）
- ✅ 数据源管理（CRUD + 连接测试 + 表浏览）
- ✅ 语义层（表/字段描述 CRUD + 批量导入导出）
- ✅ 核心 Text-to-SQL（基本查询、聚合、多轮对话）
- ✅ RAG 检索增强（相似查询）
- ✅ 查询历史管理
- ✅ 安全机制（认证拦截、用户隔离、级联删除）
- ✅ 前端 TypeScript 零错误编译
- ✅ API 文档完整可访问

**可以上线部署。**
