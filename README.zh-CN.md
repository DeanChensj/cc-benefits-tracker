# 💳 Credit Card Benefits Tracker: 本地优先美卡福利追踪器

[English Version](./README.md) | 中文版说明

---

一款极致隐私、本地优先的个人美卡报销与福利追踪工具。

**0 邮箱注册、0 密码数据库、100% 纯浏览器前端处理**。纯前端轻量架构，无任何服务器或后端定时任务（CRON）。系统在浏览器中实时将静态的卡片规则与你的本地打卡日志进行合并计算，自动处理账单周期额度重置与持卡年周年到期日。

---

## 🌟 核心亮点

*   **绝对隐私**：免注册登录、免密码、无需绑定任何网银账号（彻底告别 Plaid 等第三方接口授权导致的安全隐患与网银风控封号风险）。
*   **本地存储与云端备份**：你的持卡卡包配置与全部打卡日志，100% 加密保存在当前浏览器的 `LocalStorage` 沙盒中。支持安全备份与同步至你的个人 **Google Drive** 云端硬盘。
*   **年度反薅总结 Wrapped 海报**：极具奢华质感的 9:16 比例年度反薅账单 Wrapped 总结海报。支持根据反薅总额动态计算您的 Churner 卡神评级、动态生成专属打卡流水号、印有官方印刷网址与高级条形码，完美支持电脑端一键高清 PNG 下载及手机端长按保存到系统相册！
*   **SpentAssistant AI 消费助理 (BYOK)**：基于 **Gemini 2.5 Flash** 模型的本地安全 AI 助手。用户使用自己的 API Key（仅存于本地浏览器中，绝不经过任何中间服务器），在买单或订酒店时输入消费场景（如“吃饭 $100”），AI 会根据你当前卡包里“还未薅完的福利”和“常驻积分倍率”，实时推荐刷哪张卡最划算！
*   **精准开卡日周年计算**：持卡年福利（如凯悦 Cat 1-4、希尔顿 Aspire 等周年免房券）计算直接精确到天。系统基于你的实际开卡日期（Card Open Date），自动处理持卡年更新、月度报销、半年度额度和自然年重置的到期倒计时。
*   **多维度待办事项动态排序**：清单支持按照 **科学紧急度（Urgency）**、**到期日（Expiration Date）**、**福利价值从高到低** 以及 **福利价值从低到高** 进行一键实时重排，已核销项自动沉底。
*   **卡片单体快速过滤**：支持一键过滤待办清单，使其仅展示您钱包中某一张特定卡片实例的所有报销福利。
*   **深度核对的信用卡模板库**：内置主力高端信用卡模板，完全预置最新福利条款（如运通白金卡最新年费、希尔顿 Aspire 季度机票报销等），并配备了网络验证存活的官网直链。
*   **时间旅行调试沙盒**：顶部内置时间快进/后退工具，点击即可模拟未来的月份或年份，随时校验额度重置与房券到期状态。
*   **系统原生日历订阅**：一键生成标准 RFC 5545 `.ics` 日历事件订阅，一键导入 iPhone / Google 原生日历，由手机系统自动在福利过期前 10 天准时发出系统级强提醒。

---

## 🛠️ 技术栈

*   **框架 (Framework)**: React + Vite + TypeScript
*   **样式 (Styling)**: Tailwind CSS v4 (最新极简编译器，支持本地日夜主题)
*   **状态管理**: Zustand + Persist 缓存中间件
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
启动后在浏览器中打开 **[http://localhost:5173/](http://localhost:5173/)** 即可打开并开始使用！

### 3. 生产静态打包
```bash
npm run build
```
编译静态资源将输出在 `dist/` 目录中（静态包极轻量仅 ~265 kB，可零成本部署至 GitHub Pages, Vercel 或 Netlify 免费托管）。

---

## 📂 核心文件

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): 内置信用卡模版库配置。
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Zustand 核心卡包状态及多端同步库。
*   [`src/components/SavingsWrappedModal.tsx`](./src/components/SavingsWrappedModal.tsx): 高清 receipt 风格年度 Savings Wrapped 海报组件。
*   [`src/components/CardDetailDrawer.tsx`](./src/components/CardDetailDrawer.tsx): 响应式自适应信用卡详情抽屉。
*   [`src/components/SpentAssistant.tsx`](./src/components/SpentAssistant.tsx): 基于 Gemini AI 的本地消费助理聊天抽屉。
*   [`src/App.tsx`](./src/App.tsx): 高性能本地优先美卡追踪控制面板。
