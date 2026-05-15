<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
</p>

<h1 align="center">CodeFreex</h1>

<p align="center">
  <strong>AI 驱动的零代码应用生成平台 — 前端</strong>
</p>

<p align="center">
  <a href="https://github.com/userwanyong/codefreex">后端仓库</a> · <a href="#-快速开始">快速开始</a> · <a href="#-功能特性">功能特性</a> · <a href="#-技术栈">技术栈</a>
</p>

<br />

## 项目简介

CodeFreex 是一个 AI 驱动的零代码应用生成平台。用户只需用自然语言描述想要的应用，AI 即可自动生成完整的前端代码并部署上线。

本仓库为 CodeFreex 的前端项目，基于 **Vue 3 + TypeScript + Vite + Ant Design Vue** 构建，提供直观的用户界面，支持 AI 对话式生成应用、应用市场浏览、后台管理等功能。

## 项目速览

<p align="center">
  <img src="docs/screenshots/homepage.jpg" alt="首页" width="700" />
</p>
<p align="center">
  <img src="docs/screenshots/ai-chat.jpg" alt="AI 对话生成" width="700" />
</p>
<p align="center">
  <img src="docs/screenshots/admin.png" alt="管理后台" width="700" />
</p>

## 功能特性

### 核心功能

- **AI 对话式生成** — 通过自然语言对话描述需求，AI 自动完成需求分析、素材收集、代码生成、质量检查和构建部署
- **多阶段工作流可视化** — 实时展示 AI 工作流进度（安全审查 → 需求分析 → 素材准备 → 代码生成 → 构建 → 质量检查）
- **SSE 流式响应** — 基于 Server-Sent Events 的实时流式输出，支持断线重连
- **IDE 风格代码查看** — 内置文件树和语法高亮的代码查看器
- **一键部署** — 生成完成后一键部署到线上，即时访问

### 应用市场

- **精选应用展示** — 浏览平台精选优质应用
- **标签分类** — 通过标签快速筛选感兴趣的应用
- **点赞收藏** — 为喜欢的应用点赞
- **应用详情** — 查看应用信息、在线预览、下载源码

### 用户系统

- **邮箱注册登录** — 支持邮箱 + 验证码注册，密码登录
- **微信扫码登录** — 支持微信小程序扫码登录
- **积分体系** — 基于积分的应用生成消费模式
- **邀请码系统** — 邀请注册机制
- **兑换码充值** — 通过兑换码充值积分

### 管理后台

- **用户管理** — 用户列表、状态管理、积分调整
- **应用管理** — 应用审核、精选推荐
- **精选审批** — 精选应用申请 → 审核 → 上线工作流
- **标签管理** — 应用分类标签 CRUD
- **用量统计** — AI 模型调用 Token 用量、延迟、错误率监控
- **邀请码 / 兑换码管理** — 批量生成、使用追踪

### 界面特性

- **明暗主题切换** — 支持深色 / 浅色主题，平滑过渡动画
- **响应式设计** — 适配不同屏幕尺寸
- **Matrix 代码雨动效** — 首页动态背景效果

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) | ^3.5 |
| 语言 | [TypeScript](https://www.typescriptlang.org/) | ~6.0 |
| 构建工具 | [Vite](https://vite.dev/) | ^8.0 |
| UI 组件库 | [Ant Design Vue](https://antdv.com/) | ^4.2 |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) | ^3.0 |
| 路由 | [Vue Router](https://router.vuejs.org/) | ^5.0 |
| HTTP 客户端 | [Axios](https://axios-http.com/) | ^1.16 |
| Markdown 渲染 | [marked](https://marked.js.org/) | ^18.0 |
| 代码高亮 | [highlight.js](https://highlightjs.org/) | ^11.11 |
| API 类型生成 | [@umijs/openapi](https://openapi.tools/) | ^1.14 |
| 代码检查 | ESLint + oxlint | — |
| 代码格式化 | Prettier | ^3.8 |

## 项目结构

```
src/
├── api/                    # API 控制器（基于 OpenAPI 自动生成）
│   ├── typings.d.ts        # API 类型定义
│   ├── aiController.ts     # AI 工作流、对话、SSE 流式接口
│   ├── appController.ts    # 应用 CRUD、部署、精选、点赞
│   ├── authController.ts   # 登录、注册、微信扫码
│   └── ...
├── assets/                 # 静态资源
│   ├── base.css            # 设计系统变量（明暗主题）
│   └── main.css            # Ant Design Vue 主题覆盖
├── components/             # 公共组件
│   ├── ChatMessage.vue     # 对话消息气泡（支持 Markdown）
│   ├── CodeFilesPanel.vue  # 文件树 + 代码查看器
│   ├── FlowBackground.vue  # Matrix 代码雨背景动画
│   ├── MarkdownRenderer.vue # Markdown 渲染器
│   ├── WechatQrCode.vue    # 微信扫码登录
│   └── WorkflowProgress.vue # 工作流进度指示器
├── layouts/                # 布局组件
│   ├── BasicLayout.vue     # 主站布局
│   ├── BlankLayout.vue     # 空白布局（登录页）
│   └── AdminLayout.vue     # 管理后台布局
├── pages/                  # 页面组件
│   ├── HomePage.vue        # 首页 / 发现页
│   ├── user/               # 用户相关（登录、注册）
│   ├── app/                # 应用相关（创建、对话、详情、我的应用）
│   ├── invite/             # 邀请码
│   ├── redeem/             # 兑换码
│   ├── profile/            # 个人中心
│   └── admin/              # 管理后台（7 个管理页面）
├── router/                 # 路由配置 + 守卫
├── stores/                 # Pinia 状态管理
│   ├── themeStore.ts       # 主题切换
│   └── userStore.ts        # 用户认证状态
├── utils/                  # 工具函数
│   ├── codeFileParser.ts   # Markdown 解析为代码文件树
│   ├── response.ts         # API 响应安全解析
│   └── sse.ts              # SSE 客户端（GET/POST + 重连）
├── App.vue                 # 根组件（主题提供者）
├── main.ts                 # 入口文件
└── request.ts              # Axios 实例 + 拦截器
```

## 快速开始

### 环境要求

- **Node.js** >= 20.19.0 或 >= 22.12.0
- 后端服务已启动（参考 [后端仓库](https://github.com/userwanyong/codefreex)）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/userwanyong/codefreex-frontend.git
cd codefreex-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### API 配置

API 请求配置集中在 `config/api.ts` 文件中：

```typescript
export const API_CONFIG = {
  baseURL: '/api',           // 前端请求前缀
  proxyTarget: 'http://localhost:8123', // Vite 开发代理目标（后端地址）
  timeout: 60000,            // 请求超时时间（ms）
}
```

开发环境下，Vite 会自动将 `/api` 请求代理到后端地址。

### API 类型生成

本项目使用 `@umijs/openapi` 从后端 Swagger 文档自动生成 API 类型和请求函数：

```bash
# 确保后端服务已启动，然后运行
npm run openapi2ts
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 构建生产包 |
| `npm run build-only` | 仅构建（不进行类型检查） |
| `npm run preview` | 预览生产构建 |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | 运行 oxlint + ESLint 代码检查 |
| `npm run format` | Prettier 代码格式化 |
| `npm run openapi2ts` | 从后端 Swagger 生成 API 类型 |

## 相关仓库

| 仓库 | 说明 | 地址 |
|------|------|------|
| CodeFreex 后端 | Spring Boot 3 + LangChain4j + LangGraph4j | [github.com/userwanyong/codefreex](https://github.com/userwanyong/codefreex) |

## 贡献

欢迎贡献代码！请随时提交 Issue 或 Pull Request。

## 开源协议

[MIT License](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/userwanyong">wanyj</a> & <a href="https://github.com/BanXia">BanXia</a>
</p>
