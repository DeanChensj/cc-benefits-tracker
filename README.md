# 💳 Credit Card Benefits Tracker: Local-First Financial Sandbox

[中文版说明](./README.zh-CN.md) | English Version

---

A premium, absolute-privacy, and local-first personal credit card benefits tracker. **Zero account logins, zero password databases, and 100% browser-only processing**. 

It merges card perks metadata with your local checklist logs in real time to manage statement cycles, travel credits, and cardmember anniversaries—computed entirely client-side without any server database or backend cron jobs.

---

## 🌟 Key Features

*   **Absolute Privacy**: No email signups, no bank account sync (via Plaid), and no password database. 100% safe from data leaks or banking flag risks.
*   **Local-First Storage**: Your cards portfolio and checklist resolution states are persisted strictly inside your browser's `LocalStorage` sandbox.
*   **SpentAssistant AI (BYOK)**: A secure client-side AI assistant powered by the **Gemini 2.5 Flash** model. Paste your personal API key (stored only in local sandbox) to ask SpentAssistant where to spend (e.g., *"Kyoto hotel $350"* or *"Dining $100"*). It reads your remaining unused benefits and card point multipliers to advise you in real time.
*   **Precise Cardmember Anniversary Boundaries**: Tracks card anniversary renewals precisely down to the day based on your exact **Card Open Date**. Automatically manages monthly statement credits, semi-annual limits, calendar resets, and anniversary free nights (e.g., World of Hyatt Cat 1-4 FNR, Hilton Aspire FNR).
*   **Multi-Option Checklist Sorting**: Dynamically sort active benefits by **Urgency**, **Expiration Date**, **Value (High ➔ Low)**, or **Value (Low ➔ High)** to see instantly where you can maximize value.
*   **Card-Specific Checklist Filtering**: Cleanly filter your To-Do list to display benefits belonging only to a single card instance in your wallet.
*   **Vetted 2026 Card Database**: Includes 14 pre-configured major card templates with audited 2026 details (e.g. Amex Platinum $895 fee / $300 Equinox credit / $199 CLEAR, Hilton Aspire $200 Flight credit) and verified, redirection-resilient official landing page URLs.
*   **Time-Travel Simulator**: Built-in Month/Year fast-forward traveler at the top lets you simulate future periods instantly to verify rollover, reset, and anniversary boundaries timezone-safely.
*   **Native Calendar Sync**: Generates standard RFC 5545 `.ics` subscription files on the fly. Easily import into Apple Calendar or Google Calendar to get system-native push notifications 10 days before credits expire.

---

## 🛠️ Tech Stack

*   **Framework**: React + Vite + TypeScript
*   **Styling**: Tailwind CSS v4 (Latest compiler, CSS-only theme configs, zero runtime burden)
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

## 📂 Code Structure

*   [`src/data/cards.db.ts`](./src/data/cards.db.ts): Static credit card templates database (Amex Plat, Gold, BCP, Delta, CSR, CSP, Hyatt, Marriott, IHG).
*   [`src/store/useCardStore.ts`](./src/store/useCardStore.ts): Zustand core store handling persistent cards portfolio and logs.
*   [`src/utils/dateUtils.ts`](./src/utils/dateUtils.ts): Pure modular utility library for timezone-safe days-left calculations and scientific sorting scores.
*   [`src/utils/calendar.ts`](./src/utils/calendar.ts): iCal standard calendar subscription generator.
*   [`src/components/Toast.tsx`](./src/components/Toast.tsx): Reusable, premium sliding Toast notification popups.
*   [`src/components/DeleteConfirmModal.tsx`](./src/components/DeleteConfirmModal.tsx): Dedicated custom delete confirmation popup.
*   [`src/components/ConfirmationModal.tsx`](./src/components/ConfirmationModal.tsx): Highly reusable, generic glassmorphic confirmation modal supporting Warning, Danger, and Info layout types.
*   [`src/components/SpentAssistant.tsx`](./src/components/SpentAssistant.tsx): Isolated client-side SpentAssistant AI chat sidebar.
*   [`src/components/CalendarSyncModal.tsx`](./src/components/CalendarSyncModal.tsx): Modular native calendar subscription guides popup.
*   [`src/components/CreateCardModal.tsx`](./src/components/CreateCardModal.tsx): Modular custom card wizard and dynamic benefits constructor.
*   [`src/App.tsx`](./src/App.tsx): Elegant, modular, and highly responsive Local-first Dashboard.
