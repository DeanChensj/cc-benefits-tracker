# 💳 PerkFolio: Local-First Credit Card Perks Optimizer

[中文版说明](./README.zh-CN.md) | **English Version**

🌐 **Official Web App**: [https://perkfolio.cc/](https://perkfolio.cc/)  
🔌 **Chrome Web Store Extension**: [PerkFolio Assistant](https://chromewebstore.google.com/detail/perkfolio-assistant/bbneiifahonicipbcmhilfklpekcgdfg)

---

![PWA](https://img.shields.io/badge/Platform-PWA-purple?style=flat-square)
![Extension](https://img.shields.io/badge/Manifest-V3-teal?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square)
![Local-First](https://img.shields.io/badge/Architecture-Local--First-emerald?style=flat-square)
![GDrive Sync](https://img.shields.io/badge/Cloud--Backup-Google--Drive-sky?style=flat-square)
![Calendar Sync](https://img.shields.io/badge/Calendar--Sync-Google--Calendar-rose?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)

PerkFolio is a **premium, absolute-privacy, and local-first personal credit card perks portfolio**. 

Unlike traditional financial apps, PerkFolio operates with **zero account signups, zero database intermediaries, and zero Plaid bank logins**. It handles all logic—such as credit card anniversaries, statement cycles, progressive category spend caps, and time-travel simulations—strictly client-side in your browser's sandbox, delivering a secure, fast, and serverless credit card optimization PWA.

---

## 🚀 The Seven Badass Pillars (Core Key Features)

### 1. 🔒 Zero-Server AppData Sandbox Sync
- **Private appData Sandbox**: Your card portfolio, loyalty awards, and resolved log entries are saved directly in the browser's `localStorage` sandbox.
- **Zero Private Intermediaries**: Synchronizes losslessly and securely to your personal **Google Drive** using the strict `drive.appdata` sandbox permission. No third-party databases, no middleman servers, 100% private, and 100% free forever!

### 2. 🗓️ Live iCal-less Google Calendar REST Auto-Sync
- **Dynamic API-Level Delta Sync**: Replaced clumsy static `.ics` files with a direct Google Calendar REST API synchronization engine.
- **Real-Time Auto-Erase**: Checking off a credit card statement credit (e.g., Walmart+, streaming) on the web app **instantly deletes the calendar event from your phone in under 1 second!**
- **Tombstone Garbage Collection**: Deleting a credit card or standalone voucher instantly sweeps, tombstones, and evicts orphaned events timezone-safely, keeping your calendar clean.

### 3. 🔌 MV3 Contextual Assistant Chrome Extension (CSP-Bypass)
- **Checkout Reminders**: Dynamically injects beautiful, non-intrusive capsule reminder alerts directly at the bottom of checkout pages (e.g. Uber, Grubhub, Saks, Amazon).
- **CSP-Bypass Double Handshake**: Uses a secure `window.postMessage` triple-handshake protocol to bridge data safely from the local PWA cache, bypassing strict production HTTPS Content Security Policy (CSP) headers.
- **Session Frequency Filter**: Anti-alert fatigue safeguards limit alerts to once per browser session per merchant tab.

### 🧭 4. 4D Chrono Sandbox Time-Travel Simulator
- **Simulate the Future**: Fast-forward your portfolio months or years into the future timezone-safely using the simulated time sandbox header.
- **Chrono Synchronization**: Instantly recalculates future monthly checklists, cardmember anniversaries, active welcome offer deadlines, **Chase 5/24 status cooling countdowns**, and **Amex 1/90 rules** dynamically in the future!

### 🧠 5. Wallet AI Copilot (Gemini BYOK)
- **Private AI Audits**: Connect your private custom Google Gemini API Key directly inside the app.
- **Context-Aware Prompts**: Wallet AI Copilot possesses direct read-only access to your active benefits, expiration deadlines, multipliers, and claimed statuses.
- **Auditing & Advice**: Ask the AI assistant where to spend (e.g. *"Kyoto hotel $350"* or *"Dining $100"*) or general card advice; it will analyze your unused credits and reward programs to advise you in real time.

### 💳 6. Premium 3D Virtual Cards & Mobile Tactile Scale
- **Holographic 3D Parallax**: PC users can experience dynamic 3D parallax card tilting with hover cursor-following radial gradient highlights.
- **Tactile Press Scale (Mobile Option B)**: Mobile users can enjoy tactile mechanical press scaling (card shrinks by 2% on `onTouchStart` and bounces back smoothly on release), avoiding horizontal scroll conflicts and finger-occlusion bugs.

### 🔄 7. Autopay Subscription Resolutions (Monthly-Only Safe-Gate)
- **Set-it-and-Forget-it**: Flag recurring monthly statement credits (Walmart+, Streaming, Business Wireless bills) as automated subscriptions.
- **No-Friction Autopay Checks**: PerkFolio automatically marks subscription benefits as resolved on the first second of every month, automatically syncing to Google Calendar without manual checking!
- **Strict Safety Safeguard**: Restricts auto-claim eligibility strictly to monthly reset cycles without a spend cap, protecting high-value, deliberate travel credits (FHR, Saks, Dell, Free Nights) from accidental automation with 100% accuracy.

---

## 📊 Dynamic Year-End Savings Wrapped Poster
- **Aesthetic Vertical Poster**: Renders a gorgeous, vertical card-style poster (9:16 aspect ratio) summarizing your yearly cashback and statement credit savings.
- **Gamified Churner Badges**: Displays dynamic gamified rank badges (e.g., *Casual Saver*, *Points Wizard*, *Churning Emperor*) based on your total savings, unique serial numbers, vector barcodes, and a scan-to-open QR Code. Optimized for high-res PNG desktop downloads and long-press saving on iOS/Android!

---

## 🛠️ Tech Stack & Design Philosophy
- **Core Framework**: React + Vite + TypeScript
- **Styling System**: Vanilla CSS + Tailwind CSS v4 (Centralized Design System Tokens)
- **State & cloud Sync Engine**: Zustand + Persist Middleware (Lossless Dehydration)
- **Design Language**: Zen Minimalism (High contrast slate-850/550 readable typography, emoji-free visual grids, colored bullet indicators, glassmorphic layouts)
- **Bundle Weight**: Ultra-lightweight build footprint **(~365KB)** compiling in under 150ms!

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Developer Sandbox Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** to start.

### 3. Compile Production Bundle
```bash
npm run build
```
Production assets will output to the `dist/` directory. Ready to deploy to GitHub Pages, Vercel, or Netlify for free!

---

## 📂 Key Files

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): Vetted credit card templates catalog database.
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Persistent Zustand store handling cloud sync, calendar event registries, and custom card fallback chains.
*   [`src/utils/syncUtils.ts`](./src/utils/syncUtils.ts): Asynchronous Google Drive backup and Google Calendar REST sync delta engines.
*   [`src/components/SettingsModal.tsx`](./src/components/SettingsModal.tsx): Integrated settings modal card with high-contrast accessibility, localized translation keys, and blazing-fast dynamic feedback redirect page footers.
*   [`src/components/EditCardModal.tsx`](./src/components/EditCardModal.tsx): Edit Card modal equipped with welcome offer spent override controls, custom point multipliers, and auto-claim subscription toggles.
*   [`src/components/ChecklistCardRow.tsx`](./src/components/ChecklistCardRow.tsx): Checklist row with locked checkboxes, auto-claim badges, and dynamic urgency sorting indices.
*   [`src/components/SavingsWrappedModal.tsx`](./src/components/SavingsWrappedModal.tsx): Dynamic Savings Wrapped vertical poster engine.
*   [`src/components/WalletAiAssistant.tsx`](./src/components/WalletAiAssistant.tsx): Context-aware local AI assistant drawer.
*   [`extension/content_script.js`](./extension/content_script.js): Secure browser extension content script with escapeHTML XSS sanitizers and hover close triggers.
*   [`extension/content_web.js`](./extension/content_web.js): Secure Web-page message bridge with strict whitelist origin filters.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
