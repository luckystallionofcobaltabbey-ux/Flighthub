# FlightHub Lmtd

> **Cleared for departure.** An isometric **Blaugrana** (`#004D98` / `#A50044` / `#EDBB00`) airline reservation and dispatch terminal featuring 18 global non-copyrightable geographic carriers, dynamic distance + Jet-A1 fuel pricing, 148 airports, automated 180-seat allocation, a Razorpay mock gateway, Web Audio feedback cues, mobile PWA installability (Android & iOS), real-time Firebase Firestore cloud sync across beta testers, and a server-verified PIN-gated **Backend Developer Portal**.

---

## Core Features

- **Isometric Blaugrana Design System** — Midnight navy canvas (`#070B14`) with a 30-degree isometric architectural grid backdrop, stepped isometric card depth (`iso-depth`), Blau Royal Blue (`#004D98`), Grana Garnet (`#A50044`), and Gold (`#EDBB00`) highlights.
- **18 Global Geographic Carriers** — Non-copyrightable regional and international carriers across `Regional Shuttle`, `Narrowbody Jet`, `Widebody Long-Haul`, and `Flagship Twin-Aisle` tiers.
- **Dynamic Distance, Fuel & Wind Fare Engine** — Calculates fares per corridor from:
  - Carrier Base Slot & Terminal Fee
  - Tapered Great-Circle Distance Tariff (`Rs./km` across short/medium/long-haul bands)
  - Jet-A1 Fuel Surcharge (`L` fuel burn estimate scaled by eastbound tailwind `-5%` or westbound headwind `+8%`)
  - Domestic vs. International Airport Navigation Taxes
- **148 Global Airports Across 8 Regions** — Searchable airport selector covering India, Asia-Pacific, Middle East, Europe, North America, South America, Africa, and Oceania with coordinates and IANA timezones.
- **Automated 180-Seat Cabin Allocation (`1A`–`30F`)** — Deterministic Window (`A`, `F`), Middle (`B`, `E`), and Aisle (`C`, `D`) row-forward assignment with fallback notices, shared cross-device seat holds, and an interactive 30-row 3-3 cabin inspector.
- **Mock Razorpay Checkout Gateway** — Supports **UPI / QR**, **Cards**, **NetBanking**, and **Wallets** with sandbox 2FA bank OTP authorization and failure testing.
- **Web Audio UI Feedback** — Synthesized short acoustic cues for **Confirm Booking**, **Cancel Ticket**, **Payment Authorized**, and **Payment Declined**, with an accessible mute/unmute toggle and iOS touch unlock.
- **Cinematic Loading Sequence** — Full-screen Ken Burns parallax boot screen featuring the FlightHub Lmtd emblem, rotating operational tips, progress telemetry, and one-click **Replay Intro**.
- **Installable Mobile & Desktop PWA** — Full Progressive Web App manifest, service worker offline caching (`vite-plugin-pwa`), offline status banner, Android install prompt, and iOS Home Screen (`apple-touch-icon`, `viewport-fit=cover`, safe-area padding) support.
- **Real-Time Firebase Cloud Sync (Multi-Tester + Developer Feed)** — Syncs bookings, telemetry events, and shared cabin seat occupancy via Firebase Auth (Google Sign-In) and Cloud Firestore.
- **PIN-Gated Backend Developer Portal** — Server-verified PIN lock (`POST /api/dev-portal/verify-pin`) protecting live revenue metrics, Jet-A1 fuel yield, cabin load factor, carrier market share, beta tester reception counts, filterable event logs, JSON analytics export, and SQL contracts.

---

## Multi-Device Cloud Sync & Roles

FlightHub Lmtd supports concurrent testing across multiple phones/browsers using Firebase Authentication and Cloud Firestore:

1. **Beta Testers (Any Google Account)**
   - Tap **Sign In** in the top header bar (available on both mobile and desktop) and sign in with Google until the cloud strip shows `Cloud Synced · Beta Tester`.
   - New bookings and cancellations sync to Firestore in real time, occupy/release seats globally in `cabin_state/shared`, and remain isolated to that tester's own **View Tickets** view.
   - If a user is not signed in, the app stays in local device mode (`localStorage`) until they sign in.

2. **Developer Admin (Hashed Admin Verification)**
   - Sign in with Google using the configured Developer Admin account (`Cloud Live · Developer`) and open the **Developer Portal** tab.
   - Enter the server-verified Developer PIN to unlock global cross-tester booking aggregation, unique beta tester metrics, live event telemetry, and analytics export.
   - Sensitive local storage records (`bookings` and `events`) are encrypted at rest with Web Crypto `AES-256-GCM`, and admin email matching uses SHA-256 digests so no personal email is stored in plaintext.

---

## Install as a Phone App (PWA)

- **Android (Chrome / Edge):** Tap **Install App** in the top header or sidebar, or choose **Install app** / **Add to Home screen** from the browser menu.
- **iPhone / iPad (Safari):** Open the app URL in **Safari**, tap the **Share** icon (`↑`), and select **Add to Home Screen**.
  - *Tip for iOS:* Sign in with Google in a Safari tab first if iOS standalone Home Screen mode restricts OAuth popups.

---

## Isometric Blaugrana Palette

| Token | Hex | Role |
| :--- | :---: | :--- |
| **Blau Cobalt** | `#004D98` | Active tabs, primary structural fills, isometric left facets |
| **Grana Garnet** | `#A50044` | Primary checkout/booking CTAs, booked seat fills, isometric right facets |
| **Blaugrana Gold** | `#EDBB00` | Isometric top facets, dynamic route fares, key numerical highlights |
| **Midnight Navy** | `#070B14` | Primary canvas (60% visual field) + 30° isometric grid |
| **Deep Blau Slate** | `#0D1526` | Elevated card surfaces (30%) with `#1E2E4E` hairline borders |

---

## Global Geographic Carriers (18 Airlines)

| Carrier | Code | Hub | Fleet Tier | Cruise Speed | Rate / km |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **Barcelona Coastal Airways** | `BC` | Barcelona | Widebody Long-Haul | 895 km/h | Rs.3.15 |
| **Delhi Capital Airways** | `DC` | New Delhi | Widebody Long-Haul | 880 km/h | Rs.2.75 |
| **Mumbai Harbor Air** | `MB` | Mumbai | Narrowbody Jet | 855 km/h | Rs.2.45 |
| **Bengaluru Meridian Air** | `BM` | Bengaluru | Narrowbody Jet | 860 km/h | Rs.2.55 |
| **Kochi Malabar Express** | `KM` | Kochi | Regional Shuttle | 790 km/h | Rs.2.10 |
| **Thames Valley Airways** | `TH` | London | Flagship Twin-Aisle | 915 km/h | Rs.3.55 |
| **Paris Seine Air** | `PS` | Paris | Widebody Long-Haul | 895 km/h | Rs.3.25 |
| **Frankfurt Rhine Airways** | `FR` | Frankfurt | Flagship Twin-Aisle | 910 km/h | Rs.3.40 |
| **Zurich Alpine Shuttle** | `ZA` | Zurich | Widebody Long-Haul | 900 km/h | Rs.3.45 |
| **Dubai Desert Oasis Air** | `DO` | Dubai | Flagship Twin-Aisle | 920 km/h | Rs.3.60 |
| **Doha Pearl Corridor** | `DP` | Doha | Flagship Twin-Aisle | 915 km/h | Rs.3.42 |
| **Singapore Strait Airways** | `SS` | Singapore | Flagship Twin-Aisle | 920 km/h | Rs.3.50 |
| **Tokyo Bay Shuttle** | `TB` | Tokyo | Widebody Long-Haul | 905 km/h | Rs.3.30 |
| **Seoul Han River Air** | `SH` | Seoul | Widebody Long-Haul | 890 km/h | Rs.3.00 |
| **Hudson Harbor Airways** | `HH` | New York | Widebody Long-Haul | 895 km/h | Rs.3.10 |
| **Toronto Ontario Shuttle** | `TO` | Toronto | Narrowbody Jet | 860 km/h | Rs.2.75 |
| **Sydney Tasman Transit** | `ST` | Sydney | Widebody Long-Haul | 885 km/h | Rs.3.05 |
| **Cairo Nile Airways** | `CN` | Cairo | Narrowbody Jet | 845 km/h | Rs.2.40 |

---

## Tech Stack & Project Structure

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion, `vite-plugin-pwa`
- **Backend Server:** Express (`server.ts`) on port `3000` with Vite middleware in development and static `dist/` serving + SPA fallback in production
- **Cloud Database & Auth:** Firebase Auth (Google) + Cloud Firestore (`firebase-applet-config.json`, `firestore.rules`, `firebase-blueprint.json`)

```text
├── server.ts                  # Express server, Vite SSR/dev bridge & Developer PIN API
├── firestore.rules            # Production Firestore security rules
├── firebase-blueprint.json    # Firestore data schema & collection definitions
├── vite.config.ts             # Vite + Tailwind v4 + PWA Workbox configuration
├── index.html                 # HTML entry with iOS & PWA meta tags
├── public/                    # App icons, apple-touch-icon, and manifest assets
└── src/
    ├── App.tsx                # Main shell, Firebase auth/sync listeners & state
    ├── firebase.ts            # Firebase SDK setup & connection health check
    ├── services/
    │   └── firestoreSync.ts   # Multi-tester Firestore sync & shared cabin state
    ├── utils/
    │   ├── flightEngine.ts    # Seat allocation, distance/fuel fare & route timing
    │   └── soundEffects.ts    # Web Audio API UI feedback cues
    ├── data/
    │   ├── airlines.ts        # 18 geographic carriers & seat rules
    │   └── airports.ts        # 148 global airports with coordinates & IANA zones
    └── components/            # Booking, Tickets, Cancel, Fares, Seat Map, Checkout, Dev Portal
```

---

## Environment Variables

Configure optional variables in `.env` (see `.env.example`):

| Variable | Description |
| :--- | :--- |
| `PORT` | HTTP port for Express server (defaults to `3000`) |
| `DEV_PORTAL_PIN` | Optional server-side override for the Developer Portal unlock PIN |
| `SESSION_SECRET` | Optional HMAC signing secret for Developer Portal session tokens |
| `APP_URL` | Hosted application URL injected in deployment |

---

## Local Development & Scripts

```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite on port 3000)
npm run dev

# Type-check TypeScript
npm run lint

# Lint Firestore security rules
npx eslint DRAFT_firestore.rules firestore.rules

# Build production client bundle
npm run build

# Start production server (Node 22+ native TS strip-types)
npm run start
```

---

## Public Release & GitHub Setup

1. **Secrets & Environment:** Never commit `.env` files. Set `DEV_PORTAL_PIN` and `SESSION_SECRET` in your hosting provider's Secrets / Environment panel before making the app public.
2. **Firebase Self-Hosting:** If running on your own domain or local host, add that domain under **Firebase Console → Authentication → Settings → Authorized domains**, and deploy `firestore.rules` to your project.
3. **Node Runtime:** Requires Node.js `22.6+` (for `node server.ts` TypeScript execution) or `npm run dev` via `tsx`.

---

## License

Released under the [MIT License](./LICENSE).

