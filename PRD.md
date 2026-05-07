# 产品设计与架构文档 (PRD & Tech Spec)

## 项目名称: Local-First Credit Card Benefit Tracker (MVP)

---

### 1. 需求背景与痛点 (User Needs)
目前市面上的信用卡管理工具存在两个极端的缺陷：
*   **隐私风险极高**：需要绑定网银账号密码（通过 Plaid 等），极易触发银行风控（如 Amex/Chase 封号）。
*   **管理成本过高**：完全依赖手动维护 Excel/Google Sheet，打车或点外卖后忘记去表格里核销，导致追踪失效；无法自动在月底/年底提醒福利过期。

**核心目标**：打造一个**绝对隐私（免注册、免密码）、零运维成本（纯前端）、极低交互摩擦力**的个人信用卡福利大盘。

---

### 2. 核心功能 (Main Features)

#### 2.1 零阻力冷启动 (Zero-Friction Onboarding)
*   **内置神卡库**：系统自带主流信用卡（Amex Platinum/Gold, Chase Sapphire 等）的固定福利规则。
*   **一键添加**：用户只需在下拉列表中勾选自己持有的卡片，无需手动填写繁琐的报销周期和额度。
*   **自定义长尾 Offer**：提供极简表单，允许用户手动录入个人的临时 Offer（如：Amex Offer 满 $500 返 $50，xx日期到期）。

#### 2.2 待办式看板与极速核销 (To-Do Dashboard & Swipe UI)
*   **首屏即待办**：将所有福利（如每月 $10 Uber、每年 $200 航空报销）打平成一个 To-Do List，按“即将过期”时间强制排序。
*   **滑动核销 (Swipe to Resolve)**：利用卡片滑动交互，右滑直接标记为“本月已使用”，左滑标记为“本月放弃”，消灭传统多步骤的点击保存。

#### 2.3 系统级日历提醒 (Calendar Sync)
*   **无后端通知**：彻底抛弃邮件或短信通知。前端通过解析即将过期的福利，一键生成 `.ics` 格式的日历订阅文件。
*   **原生推送**：用户导入系统原生日历（Apple/Google Calendar）后，由手机系统负责在每月 25 号准时推送“福利即将过期”的通知。

---

### 3. System Architecture (架构 - MVP)

采用 **Local-First (本地优先)** 与 **Pure Client-Side (纯客户端)** 架构。系统完全没有后端 API 交互，无数据库，实现真正的 0 部署成本。

#### 3.1 整体拓扑
*   **前端层 (View & Logic)**：基于 Next.js / React 构建的 PWA (渐进式 Web 应用)。支持离线秒开。
*   **公共数据源 (The Truth)**：托管在 GitHub 上的开源 `cards_db.json` 文件，由 GitHub Actions + AI Agent 脚本每周定期爬取更新。
*   **本地存储层 (State)**：用户的配置（拥有哪些卡）和核销记录（哪个月用了什么）全部加密存储在浏览器的 `IndexedDB` 中。

#### 3.2 核心技术栈选型

| 模块 | 技术栈 | 说明 |
| :--- | :--- | :--- |
| **框架与部署** | Next.js (Static Export) + Vercel | 纯静态文件部署，利用全球 CDN，打开速度极快。 |
| **UI 组件库** | shadcn/ui + Tailwind CSS | 提供现代化、高颜值的暗黑/明亮模式卡片风格。 |
| **交互动画** | framer-motion | 实现丝滑的“右滑核销”物理反馈体验。 |
| **状态管理** | Zustand + Dexie.js | 管理内存状态，并持久化写入 IndexedDB。 |
| **提醒生成** | `ics` (npm package) | 纯浏览器端生成日历文件。 |

---

### 4. 数据流与状态合并机制 (Data Flow & State Merge)

这是本架构中最核心的工程逻辑，用以替代传统后端的 CRON 重置任务：

1.  **云端规则 (Rules)**：每次打开页面，应用拉取 GitHub 上的公共 JSON，获知某张卡存在 `每月重置` 的 `$10` 福利。
2.  **本地日志 (Logs)**：应用读取本地 IndexedDB，查找该福利在 `当前月份`（如当前系统时间）是否有一条 `is_used: true` 的记录。
3.  **计算渲染 (Compute)**：
    *   如果有记录，进度条显示 100% 已使用。
    *   如果到了下个月，由于本地没有新月份的核销记录，前端自动将该福利重置为“待使用”状态，重新置顶。

### 5. 未来演进规划 (Post-MVP Roadmap)
*   **跨设备同步**：集成 Google Drive API，在用户个人网盘 of App Data 隐藏文件夹中同步 JSON，实现无缝换机（BYOC 模式）。
*   **AI 账单解析插件**：提供前端纯 JS 调用的 LLM 接口，支持用户上传账单截图直接生成自定义 Offer 记录。
