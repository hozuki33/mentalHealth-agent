# AI 心理健康助手

面向用户的情绪陪伴与轻量自助工具，结合对话、心情记录与知识内容；管理端支持会话与知识库维护。

---

## 技术栈

| 层级 | 说明 |
|------|------|
| 前端 | Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus |
| 本地对话服务 | Node.js、Fastify、LangChain / LangGraph（createReactAgent）、SSE 流式输出 |

---

## 功能概览

- **前台**：登录/注册、主题切换、AI 对话（流式）、心情日记、知识文章浏览等。
- **对话链路**：浏览器可选上报粗略定位 → 本地 Agent 可调天气等工具 → 侧栏情绪/「情绪花园」类结构化展示。
- **后台**：会话与业务数据管理（与远程 API 对接；本地开发可通过 Vite 代理切换）。

---

## 本地运行

1. **前端**（仓库根目录）  
   `npm install` → `npm run dev`  
   通过 `VITE_API_TARGET`、`VITE_CHAT_SERVER`、`LOCAL_CHAT` 等环境变量控制 API 与本地对话服务代理（见 `vite.config.ts`）。

2. **本地 Agent 服务**（`server/`）  
   `cd server && npm install`  
   在.env配置自己的apikey
   `npm run dev`


---

## 运行截图

首页
<img width="3185" height="1721" alt="主题" src="https://github.com/user-attachments/assets/45da4076-15af-4ea7-9189-871987c19b9f" />
对话页面
<img width="3185" height="1721" alt="Snipaste_2026-05-02_20-17-28" src="https://github.com/user-attachments/assets/8c9aab96-b7d2-4729-a12b-e3180792e80f" />
后台管理
<img width="3185" height="1721" alt="Snipaste_2026-05-02_13-45-50" src="https://github.com/user-attachments/assets/a487abad-e51f-4c6a-b834-fd272eb53f65" />
<img width="3185" height="1721" alt="Snipaste_2026-05-02_13-56-40" src="https://github.com/user-attachments/assets/092010af-c392-4fe0-9503-8f098c303560" />


---
