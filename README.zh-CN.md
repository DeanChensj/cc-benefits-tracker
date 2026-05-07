# 💳 Credit Card Benefits Tracker: 本地优先美卡理财沙盒

[English Version](./README.md) | 中文版说明

---

一款高档、绝对隐私、零摩擦的个人信用卡福利与报销额度追踪大盘。

**0 邮箱注册、0 密码数据库运维、100% 纯浏览器前端处理**。数据完全加密存储在你本地的沙盒中，同时配备了精美的金属流光卡面、多巴胺打卡微动效、以及支持自带 API 密钥（BYOK）的安全本地 AI 消费助手！

---

## 🌟 核心亮点

*   **绝对隐私与离线支持**：免注册登录、免密码、无需绑定第三方网银密码（彻底告别 Plaid 等第三方网银同步风控被银行封号降额的风险）。
*   **本地优先 (Local-First) 架构**：持卡配置和核销打卡日志 100% 加密且持久化同步存储在当前浏览器的 `Zustand` + `LocalStorage` 沙盒中。
*   **精准开卡日周年计算**：持卡年（Cardmember Year）福利直接升级为基于你**精确开卡日 (Card Open Date)** 的天级到期倒计时。系统自动归纳月度报销、半年度额度、自然年更新、以及持卡年免房券（如凯悦 Cat 1-4、希尔顿 Aspire FNR）的精准重置边界。
*   **SpentAssistant AI 消费助理 (BYOK 模式)**：集成谷歌最新 **Gemini 2.5 Flash** 模型的本地安全 AI 助手。用户自带 API 密钥（保存在本地沙盒，绝不经过任何中间服务器），SpentAssistant 会自动抓取你大盘上**本月尚未使用的福利额度与消费积分倍率**，在京都订酒店或外出就餐买单时，实时为你给出最佳刷卡方案！
*   **“我的卡包”与“发卡行库”分层大盘**：持卡管理面板重构为最顶部的 **My Wallet (我的卡包)** 个人实卡区与下方的 **发卡行卡片模板库**，并配备了字字即显的 **模糊搜索框** 联动检索！
*   **苹果级白天/夜间模式 (Light/Dark Mode)**：支持深邃暗色调与温润护眼浅色调一键无缝切换。自动匹配设备 OS 主题偏好，并带有极具高级感的 **300ms 液体淡入淡出过渡动画**。
*   **金属流光与多巴胺打卡动效**：
    *   **全息流光**：鼠标划过卡面时，会有一缕呈 45 度斜角的全息高光扫过，完美重现高端拉丝金属信用卡的折光质感。
    *   **多巴胺打卡**：点击核销打勾时，复选框徽标会触发一个轻快 Q 弹的自转缩放动画，带来满满的任务达成多巴胺奖励。
*   **原生系统日历订阅**：纯前端生成标准 RFC 5545 `.ics` 日历事件并配有指引。一键导入 iPhone / Google 原生日历，由手机系统自动在福利过期前 10 天准时发出系统级强提醒。
*   **时间旅行调试沙盒**：顶部内置时间快进工具，点击即可模拟跨月、跨半年、跨年状态，秒级客观校验重置逻辑。

---

## 🛠️ 技术栈

*   **框架 (Framework)**: React + Vite + TypeScript (严格模块化引入)
*   **样式 (Styling)**: Tailwind CSS v4 (最速 CSS-only 编译器，支持极速日夜主题切换)
*   **状态管理**: Zustand + Persist Middleware
*   **图标库**: Lucide React

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
启动后在浏览器中打开 **[http://localhost:5173/](http://localhost:5173/)** 即可访问你的本地大盘。

### 3. 生产静态打包
```bash
npm run build
```
编译静态资源将输出在 `dist/` 目录中（打包体极轻量仅 ~257 kB，可零成本部署至 GitHub Pages, Vercel 或 Netlify 免费托管）。

---

## 📂 代码结构

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): 内置美卡数据库（包含 Amex 白金、金卡、商白、Delta、CSR、CSP、凯悦、万豪、洲际等模版配置）。
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Zustand 核心状态库，处理本地持卡及核销打卡日志。
*   [`src/utils/calendar.ts`](./src/utils/calendar.ts): iCal 订阅日历生成及文件下载器。
*   [`src/components/SpentAssistant.tsx`](./src/components/SpentAssistant.tsx): 绝对私密隔离的 SpentAssistant AI 聊天抽屉。
*   [`src/components/CalendarSyncModal.tsx`](./src/components/CalendarSyncModal.tsx): 模块化的苹果/谷歌日历导入指引弹窗。
*   [`src/components/CreateCardModal.tsx`](./src/components/CreateCardModal.tsx): 模块化的自建自定义信用卡向导弹窗。
*   [`src/App.tsx`](./src/App.tsx): 高性能、高完备度的响应式 Local-first 主控制大盘。
