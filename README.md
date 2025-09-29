# Overtime Tracker App

A **cross-platform mobile & web app** to track overtime hours, income, and tax deductions.  
Built with **React Native, TypeScript, Node, Expo, and SQLite (native)** / **localStorage (web)**.  

---

## ✨ Features
- Add overtime entries with presets for common times:
  - Weekday mornings (06–08, 07–08)
  - Weekday evenings (17–18, 17–19)
  - Saturday variable (06–10, 06–12, 06–14, 08–10, 08–12, 08–14 @ 1.5x)
  - Sunday variable (same slots @ 2.0x)
- Calculates **hours, gross pay, tax withheld, and net pay** per entry.
- Weekly totals (Sun–Sat).
- Edit or delete saved entries.
- CSV export of weekly history (persistent on device or downloadable on web).
- Settings to update:
  - Base hourly rate (default: €15.08 for 39h/week).
  - Flat tax percentage (default: 20%).
- Local data storage (works fully offline).
- Works on **Android, iOS, and Web**.

---

## 🛠 Tech Stack
- [Expo](https://expo.dev) (React Native runtime)
- [React Native](https://reactnative.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Expo Router](https://expo.github.io/router) (file-based navigation)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for native storage
- **localStorage** fallback for web
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) + [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) for CSV exports
- [dayjs](https://day.js.org/) for date handling

---

## 📦 Data Storage Model

- **Android / iOS**
  - Data saved to a local **SQLite** database inside the app sandbox.
  - Each device has its own data (not shared).
  - Data persists until the app is uninstalled or cache is cleared.
- **Web**
  - Data saved in **browser localStorage**.
  - Persists until site data is cleared (or private browsing is used).
- **No cloud backend** — all data is local.
- Exports are saved:
  - **Native:** to `FileSystem.documentDirectory/exports/…` and optionally shared via OS share sheet.
  - **Web:** downloaded as `.csv`.

---
## Notes on Privacy

- - All data is local to the user’s device.

- - No data is uploaded or synced to a server.

- - Different users cannot see each other’s history unless they explicitly export and share CSVs.
---

## 🚀 Getting Started (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (comes with `npx expo`)
- [IntelliJ IDEA](https://www.jetbrains.com/idea/) or VS Code (optional)

### Project Structure
````bash
app/              # Screens (Expo Router)
  _layout.tsx     # Root layout + navigation
  index.tsx       # Dashboard
  add.tsx         # Add/Edit entry
  history.tsx     # Weekly history
  settings.tsx    # Settings
lib/              # Logic & persistence
  calc.ts         # Pay + tax calculations
  week.ts         # Weekly ranges & utils
  types.ts        # Shared TypeScript types
  db.native.ts    # SQLite (Android/iOS)
  db.web.ts       # Stub for web (no SQLite)
  repo.ts         # Native repo (SQLite)
  repo.web.ts     # Web repo (localStorage)

````
### Setup
```bash
# clone repo
git clone https://github.com/psitsha/overtime-tracker-rn.git
cd overtime-tracker-rn

# install deps
npm install

# Running

## Android / iOS (Expo Go): scan QR from terminal or Metro devtools.

# run in Expo (Metro bundler)
npx expo start

# Web:
npx expo start --web

# Sharing the App
# Expo Go (recommended for testing)

#  1. Publish an update:
npx eas update --branch production --message "initial release"

# 2. Share the generated link/QR.
# Testers can open it in Expo Go (no need for same Wi-Fi).


