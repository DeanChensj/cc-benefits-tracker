# 💳 Credit Card Benefits Tracker: Local-First Financial Sandbox

[中文版说明](./README.zh-CN.md) | English Version

---

A premium, absolute-privacy, and local-first personal credit card benefits tracker. **Zero account logins, zero password databases, and 100% browser-only processing**. 

It merges card perks metadata with your local checklist logs in real time to manage statement cycles, travel credits, and cardmember anniversaries—computed entirely client-side without any server database or backend cron jobs.

---

## 🌟 Key Features

*   **Absolute Privacy**: No email signups, no bank account sync (via Plaid), and no password database. 100% safe from data leaks or banking flag risks.
*   **Local-First Storage & Cloud Sync**: Your cards portfolio and checklist resolution states are persisted strictly inside your browser's `LocalStorage` sandbox. Connects safely to **Google Drive** for seamless, secure personal cloud backup and synchronization.
*   **Dynamic Year-End Savings Wrapped Poster**: A gorgeous vertical poster (9:16 aspect ratio) summarizing your yearly cash recoup details. Displays dynamic Churner Level Rank Badges based on your total savings, personalized serial numbers, vector barcodes, and a scannable redirection QR Code. Fully optimized for high-res desktop downloads and direct mobile camera roll saving!
*   **SpentAssistant AI (BYOK)**: A secure client-side AI assistant powered by the **Gemini 2.5 Flash** model. Paste your personal API key (stored only in local sandbox) to ask SpentAssistant where to spend (e.g., *"Kyoto hotel $350"* or *"Dining $100"*). It reads your remaining unused benefits and card point multipliers to advise you in real time.
*   **Precise Cardmember Anniversary Boundaries**: Tracks card anniversary renewals precisely down to the day based on your exact **Card Open Date**. Automatically manages monthly statement credits, semi-annual limits, calendar resets, and anniversary free nights.
*   **Multi-Option Checklist Sorting**: Dynamically sort active benefits by **Urgency**, **Expiration Date**, **Value (High ➔ Low)**, or **Value (Low ➔ High)** to see instantly where you can maximize value.
*   **Card-Specific Checklist Filtering**: Cleanly filter your To-Do list to display benefits belonging only to a single card instance in your wallet.
*   **Vetted Card Database**: Includes audited pre-configured major card templates with updated details (e.g. Amex Platinum $895 fee, Chase Sapphire, Venture X) and verified official landing page links.
*   **Time-Travel Simulator**: Built-in Month/Year fast-forward traveler at the top lets you simulate future periods instantly to verify rollover, reset, and anniversary boundaries timezone-safely.
*   **Native Calendar Sync**: Generates standard RFC 5545 `.ics` subscription files on the fly. Easily import into Apple Calendar or Google Calendar to get system-native push notifications 10 days before credits expire.

---

## 🛠️ Tech Stack

*   **Framework**: React + Vite + TypeScript
*   **Styling**: Tailwind CSS v4
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
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser to start.

### 3. Production Build
```bash
npm run build
```
Compiled production assets will output to the `dist/` directory (~265 kB, ready to be deployed to GitHub Pages, Vercel, or Netlify for free!).

---

## 📂 Key Files

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): Pre-configured audited card templates database.
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Core Zustand state store and persistence slimmers.
*   [`src/components/SavingsWrappedModal.tsx`](./src/components/SavingsWrappedModal.tsx): High-end receipt Year-End Savings Wrapped modal.
*   [`src/components/CardDetailDrawer.tsx`](./src/components/CardDetailDrawer.tsx): Mobile-responsive details sheet drawer.
*   [`src/components/SpentAssistant.tsx`](./src/components/SpentAssistant.tsx): client-side Gemini AI SpentAssistant chat window.
*   [`src/App.tsx`](./src/App.tsx): Master Dashboard with precision recoup value calculations.
