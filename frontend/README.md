# Text-to-SQL Frontend

基于 React + TypeScript + Vite 的现代化前端应用。

## 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| TailwindCSS 4 | 样式框架 |
| Framer Motion | 动画库 |
| Axios | HTTP客户端 |
| Lucide React | 图标库 |

## 项目结构

```
frontend/
├── src/
│   ├── api/
│   │   └── index.ts          # API接口封装
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx   # 侧边栏导航
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx    # 按钮组件
│   │       ├── Card.tsx      # 卡片/Modal/Toast组件
│   │       └── Input.tsx     # 输入组件
│   │
│   ├── context/
│   │   └── AuthContext.tsx   # 认证状态管理
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx    # 登录页
│   │   ├── DashboardPage.tsx # SQL查询页
│   │   ├── DatasourcePage.tsx # 数据源管理页
│   │   └── PageComponents.tsx # 注册页等
│   │
│   ├── types/
│   │   └── index.ts          # TypeScript类型定义
│   │
│   ├── App.tsx               # 应用入口
│   ├── main.tsx              # React渲染入口
│   └── index.css             # 全局样式
│
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 页面功能

### 1. 登录页 (`/login`)
- 用户名密码登录
- 表单验证
- 动画效果
- 跳转到注册

### 2. 注册页 (`/register`)
- 用户注册表单
- 邮箱验证
- 密码确认

### 3. SQL查询页 (`/dashboard`)
- 数据源选择
- 自然语言输入
- SQL结果展示
- 查询历史记录
- 使用提示

### 4. 数据源管理页 (`/datasources`)
- 数据源列表
- 添加/编辑/删除数据源
- 测试数据库连接
- 浏览数据表
- 选择数据表

### 5. 设置页 (`/settings`)
- 个人信息修改
- 密码修改
- 系统信息展示

## 组件设计

### UI组件

#### Button
```tsx
<Button
  variant="primary" | "secondary" | "outline" | "ghost" | "danger"
  size="sm" | "md" | "lg"
  isLoading={boolean}
  icon={<Icon />}
  iconPosition="left" | "right"
>
  按钮文字
</Button>
```

#### Input
```tsx
<Input
  label="标签"
  placeholder="占位符"
  error="错误信息"
  icon={<Icon />}
  type="text" | "password" | "email"
/>
```

#### Card
```tsx
<Card
  title="标题"
  header={<ReactNode />}
  footer={<ReactNode />}
>
  内容
</Card>
```

#### Modal
```tsx
<Modal
  isOpen={boolean}
  onClose={() => void}
  title="标题"
  size="sm" | "md" | "lg"
  footer={<ReactNode />}
>
  内容
</Modal>
```

## API集成

### API模块 (`src/api/index.ts`)

```typescript
// 认证API
authAPI.login(data)      // 登录
authAPI.register(data)    // 注册
authAPI.getMe()          // 获取当前用户

// 用户API
userAPI.getAll()         // 获取用户列表
userAPI.update(id, data) // 更新用户
userAPI.delete(id)       // 删除用户

// 数据源API
dataSourceAPI.getAll()            // 获取数据源列表
dataSourceAPI.create(data)        // 创建数据源
dataSourceAPI.update(id, data)    // 更新数据源
dataSourceAPI.delete(id)          // 删除数据源
dataSourceAPI.getTables(id)       // 获取数据表
dataSourceAPI.selectTables(id, tables) // 选择数据表

// Text-to-SQL API
textToSQLAPI.query(data)         // 执行查询
textToSQLAPI.getHistory()         // 获取历史
textToSQLAPI.deleteHistory(id)    // 删除历史
```

### 认证机制

使用JWT Token认证：
1. 登录成功后保存 `access_token` 到 localStorage
2. Axios拦截器自动添加 Authorization header
3. 401响应时自动跳转到登录页

## 样式设计

### 主题颜色

| 变量 | 颜色 | 用途 |
|------|------|------|
| primary | #6366f1 | 主色调 (Indigo) |
| accent | #a78bfa | 强调色 (Purple) |
| success | #10b981 | 成功状态 (Green) |
| warning | #f59e0b | 警告状态 (Amber) |
| error | #ef4444 | 错误状态 (Red) |

### 暗色主题

```
dark-900: #0a0a0f  (背景)
dark-800: #12121a  (卡片)
dark-700: #1a1a2e  (侧边栏)
dark-600: #252538  (边框)
dark-500: #3a3a5c  (禁用)
```

### 动画

使用 Framer Motion 实现：
- 页面切换动画
- 列表项渐入
- 按钮悬停效果
- Modal缩放动画

## 环境变量

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 性能优化

1. **代码分割**: 使用动态导入
2. **Tree Shaking**: 自动移除未使用代码
3. **Gzip压缩**: 构建时启用压缩
4. **首屏优化**: 首屏JS < 150KB (gzip)

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+