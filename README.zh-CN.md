# 💳 PerkFolio: 本地优先美卡福利精算与时空沙盒

[English Version](./README.md) | **中文版说明**

🌐 **官方云 Web 应用**: [https://perkfolio.cc/](https://perkfolio.cc/)  
🔌 **Chrome 应用商店插件**: [PerkFolio Assistant](https://chromewebstore.google.com/detail/perkfolio-assistant/bbneiifahonicipbcmhilfklpekcgdfg)

---

![PWA](https://img.shields.io/badge/Platform-PWA-purple?style=flat-square)
![Extension](https://img.shields.io/badge/Manifest-V3-teal?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square)
![Local-First](https://img.shields.io/badge/Architecture-Local--First-emerald?style=flat-square)
![GDrive Sync](https://img.shields.io/badge/Cloud--Backup-Google--Drive-sky?style=flat-square)
![Calendar Sync](https://img.shields.io/badge/Calendar--Sync-Google--Calendar-rose?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)

PerkFolio 是一款**极致隐私、本地优先（Local-First）的个人高端信用卡福利精算与防薅提醒资产包**。

与传统的财务记账软件不同，PerkFolio 承诺 **“0 用户账户注册、0 集中数据库中转、0 银行网银密码授权（无 Plaid）”**。系统完全在您的浏览器沙盒中进行纯本地运行时计算，自动解析处理持卡周年周年日、流媒体报销周期、累进返现额度上限以及时间旅行模拟，为您呈献一套极致安全、毫秒响应的 serverless 美卡精算方案。

---

## 🚀 核心七大护城河功能 (Core Pillars)

### 1. 🔒 零服务器 appData 私有云安全同步
- **本地数据主权**：您的持卡卡包、房券和打卡历史日志 100% 加密保存在浏览器的本地 `localStorage` 缓存中。
- **沙盒私有备份**：直连您的个人 **Google Drive**，使用谷歌官方最严苛的 `drive.appdata` 私有隔离盘权限。无第三方中转数据库、无开发商服务器窃听风险，100% 守护资金安全，且永久免费！

### 2. 🗓️ 免日历文件导入 ➔ 谷歌日历 REST 自动同步与墓碑自愈
- **REST API 级双向联动**：彻底告别落后且需要手动导入的 `.ics` 静态文件。
- **打卡日程秒级消除**：在网页端勾选核销了一笔月度报销（如 Walmart+），**你手机上的谷歌日历日程在 1 秒钟内无感自动消失！**
- **墓碑垃圾清理 (GC)**：在 App 中删除卡片或房券时，系统会自动清理、追溯并彻底清空云端日历的所有关联残留，云盘干净如新！

### 3. 🔌 MV3 浏览器助手插件与 CSP 强安全策略突破
- **结账智能弹窗**：在您网购结账（如访问 Uber、Grubhub、Saks、Amazon）时，网页右下角会自动滑入一个极具设计感、动态匹配网站明暗主题的高级气泡，智能提醒当前最划算的刷卡方案与剩余额度！
- **双向安全握手 (CSP-Bypass)**：开发了基于 `postMessage` 的安全三向握手协议，成功突破了 HTTPS Production 网站极严苛的 Content Security Policy (CSP) 拦截，100% 零数据追踪。
- **Session 频率锁**：配备防打扰锁，每个商户标签页会话仅弹窗提醒一次，绝不干扰日常浏览。

### 🧭 4. 4D Chrono 时空沙盒时间旅行模拟器
- **穿越至未来**：通过顶部的滑动时间轴，持卡人可以 timezone-safely 穿越模拟到未来的月份和年份。
- **第四维度数据大同步**：App 会根据你模拟的时间，瞬间重组 Checklist 福利状态、持卡年重置日、开卡礼倒计时，甚至**实时计算并倒计时 Chase 5/24 的出狱日**与 **Amex 1/90 的下卡安全期**！让未来的申卡策略尽在掌控。

### 🧠 5. Wallet AI 卡包精算助理 (Gemini BYOK)
- **私有 Gemini 连接**：支持用户一键绑定自己私有的 Google Gemini API Key（仅保存在本地浏览器，绝不经过任何服务器）。
- **卡包只读审计**：精算助理具备对您本地钱包卡包的安全只读审计权（知晓持卡列表、倍率、打卡日志与过期日）。
- **反薅消费规划**：随时向它提问，如 *“我要订 400 刀京都酒店，刷哪张卡最划算？”* 或 *“我这月还有哪些报销快过期了？”*，AI 助手会在数毫秒内为你规划出最优消费策略！

### 💳 6. 3D 全息磁吸卡面与触觉压感缩放
- **3D 视差磁力卡面**：PC 端鼠标hover时，虚拟卡片呈现随指针运动的 radial gradient 微光 sheen 扫光效果与 3D perspective 倾斜视差。
- **触觉压感（Mobile Option B）**：移动端用户在点击卡片时，卡片会平滑下陷 2% 模拟物理机械按键的阻尼感，松手时丝滑回弹，完美规避横向划动冲突和手指遮挡 bug。

### 🔄 7. 自动打卡核销订阅与月度安全锁 (Auto-Claim Subscriptions)
- **懒人自动打卡**：用户可将月度固定扣款福利（如 Walmart+ 会员、流媒体、话费自动扣除）设为“自动打卡”订阅。
- **期初自动核销**：系统在每个月初的第 1 秒钟，自动将其静默标记为“已使用”并全量同步到 Google 日历，省去每月手动打卡的烦恼！
- **月度铁律安全锁**：自动打卡仅对“无消费额上限且按月重置”的纯订阅项目开放，100% 精准拦截并保护高价值 deliberate 消费资产（FHR、Saks、Dell 电脑、免房券）不被误打卡失效。

---

## 📊 奢华质感年度反薅 Wrapped 总结海报
- **9:16 竖屏海报**：为您汇总过去一整年的省钱总额、卡片回血 ROI 和开卡礼成效。
- **Churner 卡神评级勋章**：根据回血总额计算您是 *“羊毛入门生”*、*“积分大法师”* 还是 *“骨灰级卡皇”*。
- **一键高清下载**：配有专属防伪流水号、高级印刷条形码与安全静态引导二维码。完美支持桌面端 PNG 高清下载与移动端长按保存相册。

---

## 🛠️ 技术栈与美学体系
- **核心架构**: React + Vite + TypeScript
- **样式系统**: Vanilla CSS + Tailwind CSS v4 (全局统一定义 Design System Token，拒绝非标碎片)
- **状态与同步引擎**: Zustand + Persist 缓存中间件 (无损 Dehydration 序列化存储)
- **Zen 极简主义设计语言**: 高对比度 slate-850/550 灰黑色无障碍 Typography 渐变排版，**0 Emojis 视觉降噪**，纯色像素圆点微光指示器，纯粹极简。
- **轻量超跑级包体积**: 编译包物理体积仅 **~365KB**，可在 140ms 内完成极致生产编译！

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地沙盒开发服务器
```bash
npm run dev
```
启动后在浏览器中打开 **[http://localhost:5173/](http://localhost:5173/)** 即可开启时间之旅！

### 3. 静态静态生产编译
```bash
npm run build
```
生产打包文件会输出在 `dist/` 目录中。可 0 成本部署至 GitHub Pages、Vercel 或 Netlify 免费快速托管。

---

## 📂 核心项目文件架构说明

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): 内置信用卡模版与福利规则主数据库。
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): 掌控 persistent 全局 Zustand 存盘状态、日历 event ID 映射及非标卡 fallback 自愈。
*   [`src/utils/syncUtils.ts`](./src/utils/syncUtils.ts): 异步 Google Drive appData 云备份与 Google Calendar REST sync 增量同步逻辑核心。
*   [`src/components/SettingsModal.tsx`](./src/components/SettingsModal.tsx): 极致对比度设置面板，内置 dynamic 毫秒级 GitHub 反馈自愈页脚。
*   [`src/components/EditCardModal.tsx`](./src/components/EditCardModal.tsx): 修改卡片模态框，加装开卡礼消费覆盖、自定义倍率、以及月度自动打卡订阅开关。
*   [`src/components/ChecklistCardRow.tsx`](./src/components/ChecklistCardRow.tsx): Checklist 条目行，内置打卡锁闸与 `Auto` 微型高反差徽章。
*   [`src/components/SavingsWrappedModal.tsx`](./src/components/SavingsWrappedModal.tsx): Savings Wrapped 总结海报生成画布。
*   [`src/components/WalletAiAssistant.tsx`](./src/components/WalletAiAssistant.tsx): 本地 AI 卡包智能助理对话抽屉。
*   [`extension/content_script.js`](./extension/content_script.js): Chrome 浏览器助手 content script，内置安全 escapeHTML XSS 拦截过滤壳。
*   [`extension/content_web.js`](./extension/content_web.js): 插件双向握手桥接，配备 strictly 域名白名单过滤网。

---

## 📄 开源开源协议
本项目基于 MIT 协议开源。请查看 `LICENSE` 以了解更多信息。
