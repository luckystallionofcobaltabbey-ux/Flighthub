# FlightHub Lmtd

> **Cleared for departure.** A cinema-dark airline reservation terminal, automated 180-seat cabin allocator, global route-timing calculator, and live **Backend Developer Reception Portal** — inspired by **Netflix** aesthetics and booted through an iconic **GTA V** loading sequence.

---

## What Makes FlightHub Lmtd Different?

Born from a Python + MySQL command-line reservation script and reimagined as a modern React + TypeScript dispatch terminal, **FlightHub Lmtd** pairs passenger booking UX with developer-grade observability:

- **GTA V Cinematic Boot Sequence** — Launches with a full-screen Ken Burns parallax slideshow across nocturnal tarmac, high-altitude cockpit, and twilight concourse visuals, rotating cabin dispatch tips, and a skip/replay control.
- **Netflix-Inspired Dark Obsidian Interface** — Styled in deep obsidian (`#141414`), elevated carbon panels (`#18181B`), crisp monospace telemetry (`JetBrains Mono`), and high-contrast crimson accents (`#E50914`).
- **148 Global Airports Across 8 Regions** — Searchable airport selector covering India (36 hubs), Asia-Pacific, Middle East, Europe, North America, South America, Africa, and Oceania with real-world coordinates and IANA timezones.
- **Dynamic Distance & Timezone-Aware Schedules** — Computes great-circle Haversine distance (`km`), adjusts flight duration by carrier cruise speed (`800–905 km/h`) and jetstream direction, and projects exact local departure and arrival times across timezones (including `+1d` / `-1d` date-line shifts).
- **Automated 180-Seat Cabin Allocation (`1A`–`30F`)** — Preserves deterministic Window (`A`, `F`), Middle (`B`, `E`), and Aisle (`C`, `D`) row-forward seat allocation with automatic fallback notifications and an interactive 30-row 3-3 cabin seat map.
- **Mock Razorpay Checkout Gateway** — Simulates a full Razorpay modal checkout flow supporting **UPI / QR**, **Cards**, **NetBanking**, and **Wallets**, complete with sandbox 2FA bank OTP authorization and declined-payment testing.
- **Backend Developer Reception Portal** — Dedicated observability workspace for backend engineers to track live app reception KPIs, carrier revenue share, Razorpay payment authorization vs. decline rates, cabin seat-class utilization, corridor demand, structured JSON event logs, and relational SQL/REST API contracts.

---

## Backend Developer Portal

Open **Developer Portal** in the left navigation bar to inspect real-time application reception derived directly from active bookings, seat occupancy, and recorded user events:

1. **Reception & Analytics**
   - **KPI Strip**: Gross Revenue, Cabin Load Factor (`%` of 180 seats), Seat Preference Match Rate, Razorpay Authorization Rate (`ok` vs. `declined`), and Cancellation Rate.
   - **Carrier Reception & Revenue Share**: Ranked breakdown of bookings, ticket share, average distance, and revenue across all 6 partner airlines.
   - **Razorpay Method Reception & Seat-Type Utilization**: Instrument split across `UPI`, `Card`, `NetBanking`, and `Wallet`, alongside `Window` / `Middle` / `Aisle` occupancy.
   - **Route Corridor Demand & Export**: Origin-destination demand table plus one-click **Export Analytics JSON** snapshot downloads.
2. **Event Stream (`flighthub_events_v1`)**
   - Filterable audit stream tracking `SESSION_BOOT`, `BOOKING_CREATED`, `PAYMENT_AUTHORIZED`, `PAYMENT_DECLINED`, `TICKET_CANCELLED`, `TICKET_SEARCHED`, `SAMPLE_DATA_LOADED`, and `CABIN_RESET`, with expandable JSON payloads.
3. **DB Schema & Contracts**
   - Copy-ready MySQL / PostgreSQL DDL (`Booking_Details`, `Seats`, `App_Events`) and REST API contract definitions (`/api/v1/bookings`, `/api/v1/analytics/reception`) for backend integration.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **State & Telemetry** | Client-side transactional booking engine + persistent `localStorage` event log |
| **Geography & Time** | Haversine distance math + native `Intl.DateTimeFormat` IANA timezone projection |

---

## Partner Carriers

| Carrier | Code | Cruise Speed | Rating | Base Fare |
| :--- | :---: | :---: | :---: | :---: |
| **CloudNine Aviation** | `CN` | 905 km/h | 4.8 / 5 | Rs.6,000 |
| **AeroNova** | `AN` | 885 km/h | 4.7 / 5 | Rs.5,500 |
| **SkyJet Airways** | `SJ` | 860 km/h | 4.3 / 5 | Rs.4,500 |
| **BlueHorizon Airlines** | `BH` | 840 km/h | 3.9 / 5 | Rs.4,000 |
| **SunVista Air** | `SV` | 820 km/h | 3.6 / 5 | Rs.3,500 |
| **Global Wings** | `GW` | 800 km/h | 3.4 / 5 | Rs.3,000 |

---

## Local Development

```bash
npm install
npm run dev
```

Type-check, lint, and build for production:

```bash
npm run lint
npm run build
```

---

## Key Modules

- `src/components/DeveloperPortalView.tsx` — Backend Developer Portal with reception analytics, filterable event payload inspector, JSON export, and SQL/REST contracts.
- `src/components/GtaLoadingScreen.tsx` — GTA V-inspired intro sequence with Ken Burns artwork transitions and dispatch tips.
- `src/components/RazorpayCheckoutModal.tsx` — Mock Razorpay payment modal with UPI QR, Cards, NetBanking, Wallets, sandbox OTP verification, and attempt telemetry.
- `src/data/airports.ts` — 148-airport global catalog with coordinates and IANA timezones.
- `src/utils/flightEngine.ts` — Haversine route calculator, timezone projection, deterministic seat allocator, and booking/cancellation transactions.
- `src/components/CabinSeatMapView.tsx` — Interactive 30-row (`1A`–`30F`) cabin inspector.
