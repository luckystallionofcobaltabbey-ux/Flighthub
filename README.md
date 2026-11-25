# FlightHub Lmtd

> **Cleared for departure.** A cinema-dark airline reservation, automated cabin seat-allocation, and global route-timing web app inspired by **Netflix** aesthetics and booted through an iconic **GTA V** loading sequence.

---

## Why FlightHub Lmtd?

Born from a Python + MySQL command-line reservation script and reimagined as a modern React + TypeScript dispatch terminal, **FlightHub Lmtd** turns everyday flight booking into a crisp, high-contrast operational experience:

- **GTA V Cinematic Boot Sequence** — Launches with a full-screen Ken Burns parallax slideshow across nocturnal tarmac, high-altitude cockpit, and twilight concourse visuals, complete with rotating cabin dispatch tips and a real-time loading progress bar (plus a one-click **Replay Intro** control).
- **Netflix-Inspired Dark Obsidian Interface** — Styled in deep obsidian (`#141414`), elevated carbon panels (`#18181B`), crisp monospace telemetry (`JetBrains Mono`), and high-contrast crimson accents (`#E50914`).
- **148 Global Airports Across 8 Regions** — Searchable airport selector covering India (36 hubs), Asia-Pacific, Middle East, Europe, North America, South America, Africa, and Oceania with real-world latitude/longitude coordinates and IANA timezones.
- **Dynamic Distance & Timezone-Aware Flight Times** — Calculates great-circle Haversine distance (`km`), adjusts flight duration by carrier cruise speed (`800–905 km/h`) and jetstream direction, and projects exact local departure and arrival times across international timezones (including `+1d` / `-1d` date-line shifts).
- **Automated 180-Seat Cabin Allocation (`1A`–`30F`)** — Preserves deterministic Window (`A`, `F`), Middle (`B`, `E`), and Aisle (`C`, `D`) row-forward seat allocation with automatic fallback notifications and an interactive 30-row 3-3 cabin seat map.
- **Mock Razorpay Checkout Gateway** — Simulates a full Razorpay modal checkout flow supporting **UPI / QR**, **Cards**, **NetBanking**, and **Wallets**, complete with a sandbox 2FA bank OTP authorization step and failure simulation.
- **Ticket Lookup, Disambiguation & Instant Cancellation** — Search reservations by Booking ID or Passenger Name (with last-4-digit Booking ID disambiguation when multiple tickets share a name), inspect payment receipts, or cancel a booking to release its seat back into cabin inventory.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **State & Storage** | Client-side transactional engine with `localStorage` persistence |
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

Build for production:

```bash
npm run build
```

---

## Project Highlights

- `src/components/GtaLoadingScreen.tsx` — GTA V-inspired intro sequence with Ken Burns artwork transitions and dispatch tips.
- `src/components/RazorpayCheckoutModal.tsx` — Mock Razorpay payment modal with UPI QR, Cards, NetBanking, Wallets, and sandbox OTP verification.
- `src/data/airports.ts` — 148-airport global catalog with coordinates and IANA timezones.
- `src/utils/flightEngine.ts` — Haversine route calculator, timezone projection, deterministic seat allocator, and booking/cancellation transactions.
- `src/components/CabinSeatMapView.tsx` — Interactive 30-row (`1A`–`30F`) cabin inspector.
