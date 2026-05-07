# 💳 CardPerks: Local-First Credit Card Benefit Tracker

A premium, absolute privacy, and zero-friction credit card benefit tracker. Zero account logins, zero database maintenance, and zero passwords. Everything is processed purely in your browser and stored safely in your local storage.

[English Version](#english) | [中文版说明](#chinese)

---

<a name="english"></a>

## 🌟 Key Features

*   **Absolute Privacy**: No email logins, no bank account synchronization (via Plaid), and no password requirements. Prevents any risk of bank account flags or bans.
*   **Local-First Architecture**: All logs and active cards are persisted purely client-side using `Zustand` + `LocalStorage`.
*   **Dynamic Cross-Month Rollover**: Static card rules (e.g. monthly $10 Uber Cash) merge dynamically with local logs to determine active statuses. Unused/used perks are reset automatically when calendar months/years advance—without any backend CRON jobs.
*   **Native Calendar Sync**: Front-end generates standard RFC 5545 `.ics` subscription files on the fly. Easily import into Apple Calendar or Google Calendar for system-native push reminders.
*   **Developer Time-Travel Debugger**: Built-in month/year simulator at the top lets you fast-forward time instantly to verify reset and rollover logic.
*   **Data Portability**: Quick JSON backup exports and full data restore imports. You own 100% of your data.

---

<a name="chinese"></a>

## 🌟 核心亮点

*   **绝对隐私**：免注册、免密码、无需绑定网银账号密码（彻底告别 Plaid 等第三方授权导致的风控封号风险）。
*   **本地优先 (Local-First)**：持卡配置和所有核销日志全部加密且同步存储在浏览器的 `LocalStorage` 中。
*   **智能跨月/年重置**：前端利用“云端规则 + 本地日志”合并计算机制。时间跨入新月份/新周年时自动重置所有报销额度，完全不需要后端 CRON 定时任务。
*   **原生系统日历订阅**：纯前端生成 `.ics` 标准日历格式订阅，一键导入 iPhone / Google 原生日历，由手机系统在每月 25 号准时推送过期提醒。
*   **时间旅行调试器**：顶部内置时间快进工具，点击即可模拟跨月/跨年状态，调试核心逻辑更加爽快。
*   **数据绝对控制权**：支持一键导出 JSON 格式备份与导入还原，换机无忧。

---

## 🛠️ Tech Stack (技术栈)

*   **Framework**: React 19 + Vite + TypeScript
*   **Styling**: Tailwind CSS v4 (Latest compiler, CSS-only config)
*   **State Management**: Zustand + Persist Middleware
*   **Icons**: Lucide React

---

## 🚀 Quick Start (快速开始)

### 1. Install Dependencies (安装依赖)
```bash
npm install
```

### 2. Start Development Server (启动开发服务器)
```bash
npm run dev
```
*   **English**: Once started, open your browser and navigate to **[http://localhost:5173/](http://localhost:5173/)** to view your dashboard.
*   **中文**: 启动后，在浏览器中打开 **[http://localhost:5173/](http://localhost:5173/)** 即可访问你的个人福利大盘。

### 3. Production Build (生产静态打包)
```bash
npm run build
```
*   **English**: The compiled production static assets will be generated in the `dist/` directory, ready to be deployed to Vercel, Netlify, or GitHub Pages.
*   **中文**: 打包生成的静态网页文件将输出到 `dist/` 目录中，可直接零成本部署至 Vercel, Netlify 或 GitHub Pages。

---

## 📂 Code Structure (代码结构)

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): Static credit card database mapping (contains rules for Amex Gold, Platinum, CSR, Venture X).
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Zustand store handling persistent client-side state.
*   [`src/utils/calendar.ts`](./src/utils/calendar.ts): iCal RFC 5545 calendar generation and file downloader.
*   [`src/App.tsx`](./src/App.tsx): Sleek dark-theme interactive Dashboard.
