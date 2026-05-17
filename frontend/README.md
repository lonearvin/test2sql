# Text-to-SQL 前端应用

基于 React + TypeScript + Vite 的现代化前端应用，提供直观友好的用户界面，支持自然语言查询、数据库管理和智能问答功能。

---

## 项目概述

本项目是 Text-to-SQL 智能查询系统的前端部分，负责用户界面渲染、交互处理和状态管理。通过与后端 API 的配合，为用户提供流畅的自然语言转 SQL 查询体验。

### 核心功能

- **用户认证**：安全的登录注册流程，JWT Token 管理
- **智能查询**：自然语言输入，实时 SQL 生成与结果展示
- **多轮对话**：支持上下文连续问答，类似大模型对话体验
- **数据源管理**：配置和管理 MySQL/PostgreSQL 数据源
- **查询历史**：查看和管理历史查询记录
- **响应式设计**：适配桌面端和移动端设备

## 技术栈详解

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架，基于组件化的视图层 |
| TypeScript | 5.x | 类型安全，增强代码质量和 IDE 支持 |
| Vite | 6.x | 下一代前端构建工具，快速热更新 |

### UI 样式

| 技术 | 版本 | 用途 |
|------|------|------|
| TailwindCSS | 4.x | 原子化 CSS 框架，快速样式开发 |
| Framer Motion | 最新 | React 动画库，流畅的交互动画 |

### 状态管理与网络

| 技术 | 版本 | 用途 |
|------|------|------|
| React Context | 内置 | 轻量级状态管理，用于全局状态（如认证） |
| Axios | 最新 | HTTP 客户端，封装 API 请求和拦截器 |
| localStorage | 内置 | 持久化存储，Token 和偏好设置 |

### 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| ESLint | 最新 | 代码质量检查 |
| Prettier | 最新 | 代码格式化 |
| Lucide React | 最新 | 轻量级图标库 |

### 前后端交互架构

```mermaid
graph TB
    subgraph Frontend["前端 (React + Vite)"]
        UI[用户界面]
        State[React Context<br/>状态管理]
        API[Axios<br/>API 调用]
    end

    subgraph Backend["后端 (FastAPI)"]
        Auth[/auth<br/>认证]
        Users[/users<br/>用户]
        DataSources[/data-sources<br/>数据源]
        Query[/text-to-sql<br/>查询引擎]
    end

    subgraph Data["数据层"]
        Redis{{"Redis<br/>缓存"}}
        MySQL{{"MySQL<br/>管理库"}}
        ChromaDB{{"ChromaDB<br/>向量"}}
    end

    subgraph LLM["外部服务"]
        DeepSeek[DeepSeek API]
        TargetDB[目标数据库]
    end

    UI <-->|HTTP REST<br/>JWT| State
    State --> API
    API --> Auth & Users & DataSources & Query

    Query -->|Schema| Redis
    Query -->|用户数据| MySQL
    Query -->|向量检索| ChromaDB

    Query -->|LLM 调用| DeepSeek
    Query -->|SQL 执行| TargetDB

    style Frontend fill:#e1f5fe,color:#01579b
    style Backend fill:#f3e5f5,color:#4a148c
    style Data fill:#e8f5e9,color:#1b5e20
    style LLM fill:#fff3e0,color:#e65100
```

## 项目结构

### 目录树状图

```mermaid
graph TD
    subgraph Frontend["frontend/"]
        subgraph Public["public/"]
            ViteSVG[vite.svg<br/>Vite Logo]
        end

        subgraph Src["src/"]
            subgraph Api["api/"]
                APIIndex[index.ts<br/>Axios 配置<br/>API 方法]
            end

            subgraph Assets["assets/"]
                ReactSVG[react.svg<br/>React Logo]
            end

            subgraph Components["components/"]
                subgraph Layout["layout/"]
                    Sidebar[Sidebar.tsx<br/>侧边栏导航]
                end

                subgraph UI["ui/"]
                    Button[Button.tsx<br/>按钮组件]
                    Card[Card.tsx<br/>卡片/模态框]
                    Input[Input.tsx<br/>输入框组件]
                end
            end

            subgraph Context["context/"]
                AuthContext[AuthContext.tsx<br/>认证状态管理]
            end

            subgraph Pages["pages/"]
                LoginPage[LoginPage.tsx<br/>登录页面]
                DashboardPage[DashboardPage.tsx<br/>仪表盘]
                DatasourcePage[DatasourcePage.tsx<br/>数据源管理]
                QueryPage[QueryPage.tsx<br/>智能查询]
                PageComponents[PageComponents.tsx<br/>注册/设置]
            end

            subgraph Types["types/"]
                TypesIndex[index.ts<br/>TypeScript 类型定义]
            end

            App[App.tsx<br/>应用主组件]
            Main[main.tsx<br/>React 渲染入口]
            IndexCSS[index.css<br/>全局样式]
        end

        IndexHTML[index.html<br/>HTML 入口]
        PackageJSON[package.json<br/>依赖配置]
        ViteConfig[vite.config.ts<br/>Vite 配置]
        TsConfig[tsconfig.json<br/>TS 配置]
    end

    style Frontend fill:#e1f5fe,color:#01579b
    style Public fill:#ffffff,color:#000000
    style Src fill:#f3e5f5,color:#4a148c
    style Api fill:#ffffff,color:#000000
    style Assets fill:#ffffff,color:#000000
    style Components fill:#ffffff,color:#000000
    style Layout fill:#ffffff,color:#000000
    style UI fill:#ffffff,color:#000000
    style Context fill:#fff3e0,color:#e65100
    style Pages fill:#e8f5e9,color:#1b5e20
    style Types fill:#ffffff,color:#000000
```

### 组件关系图

```mermaid
graph LR
    subgraph Pages["页面层"]
        LoginPage["LoginPage<br/>登录页"]
        DashboardPage["DashboardPage<br/>仪表盘"]
        QueryPage["QueryPage<br/>智能查询"]
        DatasourcePage["DatasourcePage<br/>数据源"]
        SettingsPage["SettingsPage<br/>设置"]
    end

    subgraph Components["组件层"]
        Sidebar["Sidebar<br/>侧边栏"]
        Button["Button<br/>按钮"]
        Card["Card<br/>卡片"]
        Input["Input<br/>输入框"]
    end

    subgraph Contexts["状态管理层"]
        AuthContext["AuthContext<br/>认证状态"]
    end

    subgraph API["API 层"]
        AuthAPI["authAPI<br/>认证接口"]
        UserAPI["userAPI<br/>用户接口"]
        DataSourceAPI["dataSourceAPI<br/>数据源接口"]
        QueryAPI["textToSQLAPI<br/>查询接口"]
    end

    Pages --> Components
    Pages --> Contexts
    Contexts --> API
    Components --> API

    LoginPage --> AuthContext
    DashboardPage --> AuthContext
    QueryPage --> AuthContext
    DatasourcePage --> AuthContext

    style Pages fill:#e3f2fd,color:#0d47a1
    style Components fill:#f3e5f5,color:#4a148c
    style Contexts fill:#fff3e0,color:#e65100
    style API fill:#e8f5e9,color:#1b5e20
```

```text
├── tsconfig.app.json           # 应用特定的 TypeScript 配置
├── tsconfig.node.json          # Node 环境的 TypeScript 配置
├── eslint.config.js            # ESLint 配置
└── .env                        # 环境变量
```

## 核心模块详解

### 1. API 封装层 (`src/api/index.ts`)

API 层采用 Axios 封装，提供统一的数据交互接口。

#### Axios 实例配置

```mermaid
sequenceDiagram
    participant Component as React 组件
    participant Axios as Axios Instance
    participant Backend as Backend API
    participant LocalStorage as localStorage

    Component->>Axios: 发起请求
    Axios->>LocalStorage: 读取 Token
    LocalStorage-->>Axios: 返回 Token
    Axios->>Axios: 添加 Authorization 头
    Axios->>Backend: 发送请求
    Backend-->>Axios: 返回响应
    Axios->>Axios: 检查 401 状态码
    alt 401 错误
        Axios->>LocalStorage: 清除 Token
        Axios->>Component: 抛出错误
        Component->>Component: 跳转登录页
    else 正常响应
        Axios-->>Component: 返回数据
    end
```

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

#### 请求拦截器

- 自动从 `localStorage` 读取 JWT Token
- 添加 `Authorization: Bearer <token>` 头
- 跳过登录/注册接口的认证头

#### 响应拦截器

- 统一错误处理
- 401 响应时自动清除 Token 并跳转登录页
- 返回 Promise 方便组件调用

#### API 模块划分

```typescript
// 认证 API
authAPI.login(credentials)           // 用户登录
authAPI.register(userData)          // 用户注册
authAPI.getMe()                     // 获取当前用户信息

// 用户管理 API
userAPI.getAll(params)              // 获取用户列表
userAPI.update(id, data)             // 更新用户
userAPI.delete(id)                   // 删除用户

// 数据源 API
dataSourceAPI.getAll()               // 获取数据源列表
dataSourceAPI.create(data)           // 创建数据源
dataSourceAPI.update(id, data)       // 更新数据源
dataSourceAPI.delete(id)             // 删除数据源
dataSourceAPI.getTables(id)          // 获取数据表
dataSourceAPI.selectTables(id, tables) // 选择数据表
dataSourceAPI.testConnection(data)   // 测试连接

// 查询 API
textToSQLAPI.query(data)            // 执行查询
textToSQLAPI.getHistory(params)      // 获取查询历史
textToSQLAPI.deleteHistory(id)       // 删除历史记录
textToSQLAPI.getSimilar(params)      // 获取相似查询
```

### 2. 认证上下文 (`src/context/AuthContext.tsx`)

使用 React Context 管理全局认证状态。

#### 核心状态

```typescript
interface AuthContextType {
  user: User | null              // 当前用户
  isAuthenticated: boolean       // 是否已认证
  login: (token: string, user: User) => void  // 登录方法
  logout: () => void            // 登出方法
  isLoading: boolean            // 加载状态
}
```

#### 持久化机制

- 登录成功后将 Token 和用户信息存储到 `localStorage`
- 应用启动时从 `localStorage` 恢复认证状态
- 登出时清除所有认证信息

### 3. 页面组件

#### 3.1 登录页 (`LoginPage.tsx`)

**功能特性**：

- 用户名密码表单
- 表单验证和错误提示
- 动画效果（Framer Motion）
- 跳转到注册页面
- 记住登录状态

**核心逻辑**：

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setError('')
  setLoading(true)
  
  try {
    const response = await authAPI.login(credentials)
    login(response.access_token, response.user)
    navigate('/dashboard')
  } catch (err: any) {
    setError(err.response?.data?.detail || '登录失败')
  } finally {
    setLoading(false)
  }
}
```

#### 3.2 智能查询页 (`QueryPage.tsx`)

**功能特性**：

- 数据源选择下拉框
- 自然语言输入框
- 多轮对话支持
- 查询历史展示
- 结果表格展示
- 使用提示和示例

**核心逻辑**：

```typescript
// 多轮对话状态
const [conversationHistory, setConversationHistory] = useState<Message[]>([])

// 执行查询
const executeQuery = async (question: string) => {
  const response = await textToSQLAPI.query({
    data_source_id: selectedDataSourceId,
    question,
    conversation_history: conversationHistory,
  })
  
  // 更新对话历史
  setConversationHistory(response.conversation_history)
  // 展示结果
  setResults(response.results)
}
```

#### 3.3 数据源管理页 (`DatasourcePage.tsx`)

**功能特性**：

- 数据源列表展示
- 添加新数据源
- 编辑现有数据源
- 删除数据源
- 测试数据库连接
- 浏览和选择数据表
- 全选/取消全选数据表

**核心逻辑**：

```typescript
// 测试连接
const testConnection = async (data: DataSourceForm) => {
  try {
    await dataSourceAPI.testConnection(data)
    toast.success('连接成功')
    return true
  } catch (err) {
    toast.error('连接失败')
    return false
  }
}

// 全选数据表
const selectAllTables = () => {
  setSelectedTables(allTables.map(t => t.table_name))
}
```

#### 3.4 仪表盘页 (`DashboardPage.tsx`)

**功能特性**：

- 查询统计卡片（总数、成功数、失败数）
- 最近查询历史（限制显示 10 条）
- 立即体验引导
- 数据源快捷入口

### 4. UI 组件库

#### 4.1 Button 组件

**变体**：

- `primary`：主要按钮，蓝色背景
- `secondary`：次要按钮，灰色背景
- `outline`：边框按钮
- `ghost`：幽灵按钮，透明背景
- `danger`：危险按钮，红色背景

**尺寸**：

- `sm`：小按钮
- `md`：中等按钮（默认）
- `lg`：大按钮

**示例**：

```tsx
<Button
  variant="primary"
  size="md"
  isLoading={isLoading}
  icon={<PlusIcon />}
  iconPosition="left"
  onClick={handleClick}
>
  添加数据源
</Button>
```

#### 4.2 Input 组件

**功能**：

- 标签显示
- 占位符文本
- 错误提示
- 前置/后置图标
- 多种输入类型

**示例**：

```tsx
<Input
  label="数据库主机"
  placeholder="请输入主机地址"
  value={host}
  onChange={(e) => setHost(e.target.value)}
  error={errors.host}
  icon={<DatabaseIcon />}
/>
```

#### 4.3 Card 组件

**功能**：

- 标题和内容区域
- 可选的头部和底部插槽
- 模态框模式
- 提示框模式

**示例**：

```tsx
<Card
  title="数据源详情"
  header={<Badge>MySQL</Badge>}
  footer={
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>取消</Button>
      <Button variant="primary" onClick={onSave}>保存</Button>
    </div>
  }
>
  <FormComponent />
</Card>
```

## 状态管理

### 认证状态流

```mermaid
stateDiagram-v2
    [*] --> AppStart: 应用启动
    AppStart --> CheckStorage: 检查 localStorage

    CheckStorage --> HasToken: Token 存在
    CheckStorage --> NoToken: Token 不存在

    HasToken --> ValidateToken: 验证 Token
    ValidateToken --> GetUserInfo: 获取用户信息
    GetUserInfo --> Authenticated: 设置认证状态
    Authenticated --> MainApp: 进入主界面

    NoToken --> Unauthenticated: 未认证状态
    Unauthenticated --> LoginPage: 进入登录页
    LoginPage --> Authenticated: 登录成功
    LoginPage --> RegisterPage: 跳转到注册
    RegisterPage --> Authenticated: 注册成功

    Authenticated --> Logout: 登出
    Logout --> Unauthenticated: 清除 Token

    MainApp --> [*]: 应用关闭

    note right of CheckStorage
        持久化机制：
        • Token 存储在 localStorage
        • 用户信息缓存
    end note
```

### 查询状态流

```mermaid
flowchart TD
    Start([用户输入问题]) --> Submit[提交查询]

    Submit --> Loading{发送 API 请求}

    Loading -->|请求中| ShowLoading[显示加载状态<br/>加载动画]

    Loading -->|成功| UpdateHistory[更新对话历史]
    UpdateHistory --> ShowResults[展示查询结果]
    ShowResults --> Success([查询完成])

    Loading -->|失败| ShowError[显示错误提示]
    ShowError --> Retry{用户选择}
    Retry -->|重试| Submit
    Retry -->|取消| Cancel([取消查询])

    ShowResults -->|继续查询| Start

    style Loading fill:#fff3e0
    style ShowLoading fill:#fff3e0
    style ShowResults fill:#e8f5e9
    style ShowError fill:#ffebee
    style Success fill:#e8f5e9
    style Cancel fill:#ffebee
```

## 样式设计

### 主题系统

#### 颜色变量

```css
:root {
  /* 主色调 */
  --color-primary: #6366f1;        /* Indigo */
  --color-accent: #a78bfa;         /* Purple */
  
  /* 状态色 */
  --color-success: #10b981;        /* Green */
  --color-warning: #f59e0b;        /* Amber */
  --color-error: #ef4444;          /* Red */
  
  /* 中性色 */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}
```

#### 暗色主题

```css
.dark {
  --color-background: #0a0a0f;
  --color-surface: #12121a;
  --color-sidebar: #1a1a2e;
  --color-border: #252538;
  --color-muted: #3a3a5c;
  --color-text: #e5e7eb;
  --color-text-secondary: #9ca3af;
}
```

### 动画效果

使用 Framer Motion 实现流畅动画：

```typescript
// 页面切换
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

// 列表项渐入
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}
```

## 环境配置

### 开发环境 (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 生产环境

生产构建时，API URL 通过环境变量配置：

```bash
# 构建时指定
VITE_API_URL=https://api.example.com/api/v1 npm run build
```

## 开发指南

### 环境搭建

```bash
# 1. 安装 Node.js (>= 18.0.0)
node --version

# 2. 克隆项目
git clone <repository-url>
cd text_to_sql/frontend

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:5173
```

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行代码检查 |
| `npm run lint:fix` | 自动修复代码问题 |

### 代码规范

#### TypeScript 规范

- 启用严格模式
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和别名
- 避免使用 `any`，使用 `unknown` 替代
- 显式声明函数返回类型

#### React 规范

- 函数组件优先
- 使用 Hooks 管理状态
- Props 使用 `interface` 定义
- 组件文件以 `.tsx` 结尾
- 样式文件以 `.module.css` 结尾（可选）

#### 命名规范

- 组件名：PascalCase（`LoginPage.tsx`）
- 变量/函数：camelCase（`handleSubmit`）
- 常量：UPPER_SNAKE_CASE（`MAX_RESULTS`）
- 文件名：kebab-case（`auth-context.tsx`）

### 组件开发流程

1. **定义 Props 类型**
2. **实现组件逻辑**
3. **添加样式**
4. **导出组件**
5. **编写文档注释**

示例：

```typescript
// src/components/ui/MyComponent.tsx

import React from 'react'

interface MyComponentProps {
  title: string
  children: React.ReactNode
  onAction?: () => void
}

/**
 * MyComponent 描述
 * @param title - 标题
 * @param children - 内容
 * @param onAction - 操作回调
 */
export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  children,
  onAction
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{title}</h2>
      <div>{children}</div>
      {onAction && (
        <button onClick={onAction}>执行操作</button>
      )}
    </div>
  )
}
```

### 页面开发流程

1. **创建页面文件**
2. **定义页面状态**
3. **实现业务逻辑**
4. **集成 API 调用**
5. **添加路由**
6. **测试页面功能**

## 性能优化

### 代码分割

使用动态导入减少首屏加载时间：

```typescript
const LazyPage = React.lazy(() => import('./pages/LazyPage'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyPage />
    </Suspense>
  )
}
```

### 组件优化

- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 合理使用 `key` 属性

### 构建优化

Vite 自动进行：

- Tree Shaking：移除未使用的代码
- 代码压缩：减小文件体积
- Gzip 压缩：加快传输速度
- 资源优化：图片、字体等

## 测试

### 单元测试（待实现）

使用 Vitest 或 Jest：

```bash
npm run test
```

### 集成测试（待实现）

使用 React Testing Library：

```bash
npm run test:integration
```

### E2E 测试（待实现）

使用 Playwright：

```bash
npm run test:e2e
```

## 浏览器支持

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## 故障排查

### 常见问题

#### 1. API 请求失败

**症状**：请求返回 401 或网络错误

**排查步骤**：

1. 检查后端服务是否运行
2. 确认 API URL 配置正确
3. 检查 Token 是否过期
4. 查看浏览器控制台日志

**解决方案**：

```typescript
// 检查 API 配置
console.log(import.meta.env.VITE_API_URL)

// 检查 Token
console.log(localStorage.getItem('token'))

// 清除并重新登录
localStorage.clear()
window.location.href = '/login'
```

#### 2. 样式不生效

**症状**：TailwindCSS 样式未应用

**排查步骤**：

1. 确认 TailwindCSS 配置正确
2. 检查类名拼写
3. 检查构建缓存

**解决方案**：

```bash
# 清除缓存
rm -rf node_modules/.vite

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

#### 3. TypeScript 类型错误

**症状**：TS2307 或 TS2322 等错误

**排查步骤**：

1. 查看错误信息定位问题
2. 检查类型定义
3. 确认导入路径

**解决方案**：

```bash
# 重新生成类型定义
npm run typecheck

# 修复类型问题
# 确保 API 响应类型与前端类型一致
```

### 调试技巧

#### 1. React DevTools

安装 React DevTools 浏览器扩展，查看组件树和状态。

#### 2. Network 面板

使用浏览器开发者工具的 Network 面板，查看 API 请求和响应。

#### 3. Console 日志

在关键位置添加 console.log：

```typescript
console.log('State:', state)
console.log('Response:', response)
```

## 部署

### 静态部署

前端构建为静态文件，可部署到任意静态服务器：

```bash
# 构建生产版本
npm run build

# 输出到 dist/ 目录
ls dist/
```

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### CI/CD

使用 GitHub Actions 示例：

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: [frontend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: cd frontend && npm install
        
      - name: Build
        run: cd frontend && npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
          
      - name: Deploy
        run: # 部署命令
```

## 维护指南

### 依赖更新

定期更新依赖以获得安全补丁和新特性：

```bash
# 检查可更新依赖
npm outdated

# 更新依赖
npm update

# 更新到最新版本
npx npm-check-updates -u
npm install
```

### 代码重构

重构前确保：

- 有完整的测试覆盖
- 理解重构的影响范围
- 分步骤进行，每次小改动
- 及时提交，保留历史

### 性能监控

部署后监控：

- 页面加载时间
- API 响应时间
- 用户交互延迟
- 错误率

## 贡献指南

### 开发流程

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/xxx`
3. 提交更改：`git commit -m 'feat: 添加新功能'`
4. 推送分支：`git push origin feature/xxx`
5. 创建 Pull Request

### 代码审查

- 遵循项目代码规范
- 确保通过所有 CI 检查
- 添加必要的测试
- 更新相关文档

## 许可证

MIT License

## 联系方式

- GitHub Issues：[项目 Issues]
- 技术讨论：[Discussions]
