# 💳 Credit Card Benefits Tracker: Local-First Financial Sandbox

[中文版说明](./README.zh-CN.md) | English Version

---

A premium, absolute-privacy, and zero-friction personal credit card benefits tracker. Featuring **Zero Account Logins, Zero Password Databases, and 100% Client-Side Processing**. It runs entirely inside your browser sandboxed storage, fully fortified with dynamic OS preferences, high-end micro-animations, and a client-side AI SpentAssistant.

---

## 🌟 Key Features

*   **Absolute Privacy & Offline-Capable**: No email logins, no net-banking link synchronization (via Plaid), and no password requirements. Zero risk of personal financial leaks or bank account wind-down flags.
*   **Local-First Architecture**: All card instances and checklist resolution logs are persisted strictly client-side inside your browser's `Zustand` + `LocalStorage` sandbox.
*   **Dynamic Cards Open Date & Precise Expirations**: Upgraded card anniversary tracking to precise day-level boundaries based on your exact card open date. The system handles monthly statement cycles, semi-annual limits, calendar resets, and precise cardmember anniversary boundaries (e.g. World of Hyatt FNR, Hilton Aspire FNR) automatically.
*   **SpentAssistant AI (BYOK Mode)**: An elite, secure, browser-level AI spending assistant powered by the **Gemini 2.5 Flash** model. Paste your personal Gemini API key (safely stored in browser LocalStorage, never sent to intermediate servers) to instantly ask SpentAssistant where to spend (e.g. *"Kyoto hotel $350"* or *"Dining $100"*). It reads your remaining unused benefits context and points multiplier rates to advise you in real time!
*   **Sleek "My Wallet" & "Card Library" Division**: The card manager is divided into an active, customizable personal **My Wallet** (your actual held cards at the top) and a grouped **Add Cards Library** (organized vertically by issuer banks: Amex, Chase, Capital One at the bottom) featuring dynamic **Instant Fuzzy Search** across both layers!
*   **Apple-Style Day & Night Themes**: Seamless one-click toggle between a deep slate dark mode and a gentle paper-like light mode, complete with system OS preferences auto-matching and a smooth **300ms liquid cross-fade transition**.
*   **Premium Shimmer & Dopamine Micro-Animations**: 
    *   **Holographic Sweep**: Hover over any card template slot or custom card to see a skewed glossy high-light sweep across the card face, mimicking real brushed metal cards.
    *   **Dopamine Check**: Resolving a perk triggers a snappy micro-bounce pop scale-up checkbox animation, giving you a satisfying visual reward.
*   **Native Calendar Sync**: Generate standard RFC 5545 `.ics` files on the fly with a helpful guide. Easily import into Apple Calendar, Mac Calendar, or Google Calendar for native push notifications 10 days before credits expire.
*   **Developer Time-Travel Sandbox**: Built-in Month/Year time traveler at the top lets you simulate future periods instantly to verify rollovers, resets, and next-year anniversary events.

---

## 🛠️ Tech Stack

*   **Framework**: React + Vite + TypeScript (Strict modular imports)
*   **Styling**: Tailwind CSS v4 (Latest compiler, dynamic dark theme overlays, zero runtime burden)
*   **State Management**: Zustand + Persist Middleware
*   **Icons**: Lucide React

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Once started, open your browser and navigate to **[http://localhost:5173/](http://localhost:5173/)** to view your personal local sandbox.

### 3. Production Build
```bash
npm run build
```
The compiled production static assets will be generated in the `dist/` directory (ultra-lightweight ~257 kB, ready to be deployed to Vercel, Netlify, or GitHub Pages for free!).

---

## 📂 Code Structure

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): Static credit card database mapping (includes Amex Plat, Gold, Biz Plat, Delta, CSR, CSP, Hyatt, Marriott, IHG templates).
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Zustand core store handling persistent cards and transaction logs.
*   [`src/utils/calendar.ts`](./src/utils/calendar.ts): iCal calendar builder and subscription file generator.
*   [`src/components/SpentAssistant.tsx`](./src/components/SpentAssistant.tsx): Isolated secure SpentAssistant AI chat sidebar.
*   [`src/components/CalendarSyncModal.tsx`](./src/components/CalendarSyncModal.tsx): Modular Apple/Google Calendar subscription guides popup.
*   [`src/components/CreateCardModal.tsx`](./src/components/CreateCardModal.tsx): Modular custom card wizard and dynamic benefits constructor.
*   [`src/App.tsx`](./src/App.tsx): High-end, transitions-smooth responsive local-first Dashboard.
