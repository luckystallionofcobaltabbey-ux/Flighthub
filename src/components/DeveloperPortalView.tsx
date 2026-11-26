import { FormEvent, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  KeyRound,
  Lock,
  Palette,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { AIRLINES, AIRPORTS } from '../data/airlines';
import {
  AppEventRecord,
  AppEventType,
  BookingRecord,
  PaymentMethod,
  SeatRecord,
} from '../types/flighthub';
import { IsometricBlaugranaCube } from './IsometricMotif';

interface DeveloperPortalViewProps {
  bookings: BookingRecord[];
  seats: SeatRecord[];
  events: AppEventRecord[];
  devUnlocked: boolean;
  userEmail: string | null;
  isDeveloperEmail: boolean;
  onUnlockDevPortal: (token: string) => void;
  onLockDevPortal: () => void;
  onSignInCloud: () => void;
  onLoadSampleData: () => void;
  onClearEvents: () => void;
}

const BLAUGRANA_PALETTE_TOKENS = [
  { name: 'Blau Cobalt', hex: '#004D98', role: 'Primary Isometric Plane & Actions' },
  { name: 'Grana Garnet', hex: '#A50044', role: 'Checkout CTA & Booked Accents' },
  { name: 'Blaugrana Gold', hex: '#EDBB00', role: 'Top Cube Face & Fare Highlights' },
  { name: 'Midnight Navy', hex: '#070B14', role: 'Isometric Canvas (60%)' },
  { name: 'Deep Blau Slate', hex: '#0D1526', role: 'Structural Cards (30%)' },
];

const BACKEND_SCHEMA_SQL = `-- FlightHub Lmtd Relational Schema (MySQL / PostgreSQL)
CREATE TABLE IF NOT EXISTS Booking_Details (
  Booking_ID VARCHAR(255) PRIMARY KEY,
  Name_of_Ticketholder VARCHAR(255) NOT NULL,
  Citizenship VARCHAR(255) NOT NULL,
  Seat_Preference VARCHAR(20) NOT NULL,
  Seat_Booked VARCHAR(10) NOT NULL,
  Airline VARCHAR(255) NOT NULL,
  Airline_Code VARCHAR(10) NOT NULL,
  Departure_DateandTime DATETIME NOT NULL,
  Departure_Airport VARCHAR(10) NOT NULL,
  Arrival_DateandTime DATETIME NOT NULL,
  Arrival_Airport VARCHAR(10) NOT NULL,
  Duration_Minutes INT NOT NULL,
  Distance_Km INT NOT NULL,
  Base_Fare DECIMAL(10, 2) NOT NULL,
  Distance_Charge DECIMAL(10, 2) NOT NULL,
  Fuel_Surcharge DECIMAL(10, 2) NOT NULL,
  Airport_Taxes DECIMAL(10, 2) NOT NULL,
  Estimated_Fuel_Litres INT NOT NULL,
  Fare DECIMAL(10, 2) NOT NULL,
  Payment_Order_ID VARCHAR(64),
  Payment_Ref_ID VARCHAR(64),
  Payment_Method VARCHAR(20),
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Seats (
  Seat_Number VARCHAR(10) PRIMARY KEY,
  Seat_Type VARCHAR(20) NOT NULL,
  Is_Booked BOOLEAN DEFAULT FALSE,
  Booking_ID VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS App_Events (
  Event_ID VARCHAR(64) PRIMARY KEY,
  Event_Type VARCHAR(40) NOT NULL,
  Occurred_At TIMESTAMP NOT NULL,
  Summary TEXT NOT NULL,
  Payload_JSON JSON
);`;

type PortalSubTab = 'analytics' | 'events' | 'schema';

export function DeveloperPortalView({
  bookings,
  seats,
  events,
  devUnlocked,
  userEmail,
  isDeveloperEmail,
  onUnlockDevPortal,
  onLockDevPortal,
  onSignInCloud,
  onLoadSampleData,
  onClearEvents,
}: DeveloperPortalViewProps) {
  const [subTab, setSubTab] = useState<PortalSubTab>('analytics');
  const [eventFilter, setEventFilter] = useState<'ALL' | AppEventType>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinChecking, setPinChecking] = useState(false);

  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const trimmed = pinInput.trim();
    if (!trimmed) {
      setPinError('Enter the Developer PIN.');
      return;
    }

    setPinChecking(true);
    try {
      const res = await fetch('/api/dev-portal/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: trimmed }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        setPinError(data.error || 'Incorrect Developer PIN.');
        return;
      }
      setPinInput('');
      onUnlockDevPortal(data.token);
    } catch {
      setPinError('Unable to verify PIN with server.');
    } finally {
      setPinChecking(false);
    }
  };

  const testerMetrics = useMemo(() => {
    const testerEmails = new Set<string>();
    let testerBookingsCount = 0;
    for (const b of bookings) {
      if (b.actorRole === 'tester') {
        testerBookingsCount += 1;
        if (b.actorEmail) testerEmails.add(b.actorEmail);
      }
    }
    for (const ev of events) {
      if (ev.actorRole === 'tester' && ev.actorEmail) {
        testerEmails.add(ev.actorEmail);
      }
    }
    return {
      uniqueTesters: testerEmails.size,
      testerBookingsCount,
      testerEmails: Array.from(testerEmails),
    };
  }, [bookings, events]);

  const analytics = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.fare, 0);
    const totalFuelCollected = bookings.reduce(
      (sum, b) => sum + (b.fareBreakdown?.fuelSurcharge ?? 0),
      0
    );
    const totalBookings = bookings.length;
    const avgFare =
      totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    const bookedSeatsCount = seats.filter((s) => s.isBooked).length;
    const loadFactorPct =
      seats.length > 0
        ? Math.round((bookedSeatsCount / seats.length) * 1000) / 10
        : 0;

    const preferenceCandidates = bookings.filter(
      (b) => b.seatPreference !== 'No Preference'
    );
    const preferenceMetCount = preferenceCandidates.filter(
      (b) => b.preferenceStatus === 'Preferred seat assigned'
    ).length;
    const preferenceFulfillmentPct =
      preferenceCandidates.length > 0
        ? Math.round((preferenceMetCount / preferenceCandidates.length) * 100)
        : 100;

    const cancellationsCount = events.filter(
      (e) => e.type === 'TICKET_CANCELLED'
    ).length;
    const totalIssuedIncludingCancelled = totalBookings + cancellationsCount;
    const cancellationRatePct =
      totalIssuedIncludingCancelled > 0
        ? Math.round(
            (cancellationsCount / totalIssuedIncludingCancelled) * 1000
          ) / 10
        : 0;

    const authorizedPayments = events.filter(
      (e) => e.type === 'PAYMENT_AUTHORIZED'
    ).length;
    const declinedPayments = events.filter(
      (e) => e.type === 'PAYMENT_DECLINED'
    ).length;
    const totalPaymentAttempts = authorizedPayments + declinedPayments;
    const paymentSuccessPct =
      totalPaymentAttempts > 0
        ? Math.round((authorizedPayments / totalPaymentAttempts) * 1000) / 10
        : 100;

    const searchesCount = events.filter(
      (e) => e.type === 'TICKET_SEARCHED'
    ).length;

    // Carrier Reception Breakdown across all 18 airlines
    const carrierStats = AIRLINES.map((airline) => {
      const carrierBookings = bookings.filter(
        (b) => b.airlineCode === airline.code
      );
      const revenue = carrierBookings.reduce((s, b) => s + b.fare, 0);
      const avgDistance =
        carrierBookings.length > 0
          ? Math.round(
              carrierBookings.reduce((s, b) => s + (b.distanceKm ?? 0), 0) /
                carrierBookings.length
            )
          : 0;
      const sharePct =
        totalBookings > 0
          ? Math.round((carrierBookings.length / totalBookings) * 100)
          : 0;
      return {
        ...airline,
        count: carrierBookings.length,
        revenue,
        avgDistance,
        sharePct,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.rating - a.rating);

    // Payment Method Reception
    const methods: PaymentMethod[] = ['UPI', 'Card', 'NetBanking', 'Wallet'];
    const paymentMethods = methods.map((method) => {
      const matching = bookings.filter((b) => b.payment?.method === method);
      const volume = matching.reduce((s, b) => s + b.fare, 0);
      const sharePct =
        totalBookings > 0
          ? Math.round((matching.length / totalBookings) * 100)
          : 0;
      return {
        method,
        count: matching.length,
        volume,
        sharePct,
      };
    });

    // Cabin Utilization by Seat Type
    const seatTypes = (['Window', 'Middle', 'Aisle'] as const).map((type) => {
      const ofType = seats.filter((s) => s.seatType === type);
      const bookedOfType = ofType.filter((s) => s.isBooked).length;
      return {
        type,
        total: ofType.length,
        booked: bookedOfType,
        pct: Math.round((bookedOfType / ofType.length) * 100),
      };
    });

    // Top Corridors
    const routeMap = new Map<
      string,
      { route: string; count: number; revenue: number; distanceKm: number }
    >();
    bookings.forEach((b) => {
      const key = `${b.departureAirport} → ${b.arrivalAirport}`;
      const cur = routeMap.get(key) ?? {
        route: key,
        count: 0,
        revenue: 0,
        distanceKm: b.distanceKm ?? 0,
      };
      cur.count += 1;
      cur.revenue += b.fare;
      if (!cur.distanceKm && b.distanceKm) cur.distanceKm = b.distanceKm;
      routeMap.set(key, cur);
    });
    const topRoutes = Array.from(routeMap.values()).sort(
      (a, b) => b.count - a.count || b.revenue - a.revenue
    );

    return {
      totalRevenue,
      totalFuelCollected,
      totalBookings,
      avgFare,
      bookedSeatsCount,
      loadFactorPct,
      preferenceFulfillmentPct,
      cancellationsCount,
      cancellationRatePct,
      authorizedPayments,
      declinedPayments,
      paymentSuccessPct,
      searchesCount,
      carrierStats,
      paymentMethods,
      seatTypes,
      topRoutes,
    };
  }, [bookings, seats, events]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'ALL') return events;
    return events.filter((e) => e.type === eventFilter);
  }, [events, eventFilter]);

  const handleExportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      service: 'FlightHub Lmtd',
      carrierCount: AIRLINES.length,
      airportNetworkCount: AIRPORTS.length,
      summary: {
        totalRevenue: analytics.totalRevenue,
        totalFuelCollected: analytics.totalFuelCollected,
        activeBookings: analytics.totalBookings,
        cabinLoadFactorPct: analytics.loadFactorPct,
        preferenceFulfillmentPct: analytics.preferenceFulfillmentPct,
        cancellationRatePct: analytics.cancellationRatePct,
        razorpayAuthorized: analytics.authorizedPayments,
        razorpayDeclined: analytics.declinedPayments,
      },
      bookings,
      recentEvents: events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flighthub-lmtd-analytics-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(BACKEND_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (!devUnlocked) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="bg-[#0D1526] border border-[#1E2E4E] rounded-2xl iso-depth p-7 space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#070B14] border border-[#1E2E4E] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#EDBB00]" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white tracking-tight">
                Developer Backend Gate
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Enter the 4-digit Developer PIN to inspect live beta tester
                reception, carrier yields, and telemetry logs.
              </p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="dev-portal-pin"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Developer PIN
              </label>
              <input
                id="dev-portal-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={12}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-3 text-center font-mono text-lg tracking-[0.45em] bg-[#070B14] border border-[#1E2E4E] focus:border-[#1C6DD0] rounded-xl text-white focus:outline-none"
              />
            </div>

            {pinError && (
              <p className="text-xs text-[#FF4D88] font-medium">{pinError}</p>
            )}

            <button
              type="submit"
              disabled={pinChecking}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-[#004D98] to-[#A50044] hover:from-[#1C6DD0] hover:to-[#BE0A54] rounded-xl transition-all inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#EDBB00]" />
              <span>
                {pinChecking ? 'Verifying PIN...' : 'Unlock Developer Portal'}
              </span>
            </button>
          </form>

          <div className="pt-3 border-t border-[#1E2E4E] text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <span>
              {userEmail
                ? isDeveloperEmail
                  ? `Admin: ${userEmail}`
                  : `Tester: ${userEmail}`
                : 'Not signed in'}
            </span>
            {!isDeveloperEmail && (
              <button
                type="button"
                onClick={onSignInCloud}
                className="text-[#60A5FA] hover:underline font-medium shrink-0"
              >
                Sign in as Dev
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm flex items-center justify-center shrink-0 mt-0.5">
            <IsometricBlaugranaCube className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Backend Developer Portal
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Live app reception metrics, Jet-A1 fuel/distance tariff yields,
              Razorpay telemetry, and SQL contracts across {AIRLINES.length}{' '}
              carriers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {bookings.length === 0 && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#0D1526] border border-[#1E2E4E] hover:bg-[#121D33] rounded-lg transition-colors whitespace-nowrap"
            >
              Seed Sample Bookings
            </button>
          )}
          <button
            type="button"
            onClick={handleExportSnapshot}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics JSON</span>
          </button>
          <button
            type="button"
            onClick={onLockDevPortal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#0D1526] border border-[#1E2E4E] hover:text-white hover:border-[#1C6DD0] rounded-lg transition-colors whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 text-[#EDBB00]" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {!isDeveloperEmail && (
        <div className="p-4 rounded-xl bg-[#0D1526] border border-[#EDBB00]/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            Currently viewing {userEmail ? `tester scope (${userEmail})` : 'local device data'}. Sign in with your{' '}
            <span className="font-semibold text-[#EDBB00]">Developer Google account</span> to aggregate bookings &amp; telemetry from all beta testers.
          </div>
          <button
            type="button"
            onClick={onSignInCloud}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#004D98] hover:bg-[#1C6DD0] rounded-lg transition-colors whitespace-nowrap"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {isDeveloperEmail && (
        <div className="p-3.5 rounded-xl bg-[#0D1526] border border-emerald-500/35 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="inline-flex items-center gap-2 text-emerald-300 font-medium">
            <Users className="w-4 h-4 shrink-0" />
            <span>
              Global Developer Feed Active — {testerMetrics.uniqueTesters}{' '}
              beta {testerMetrics.uniqueTesters === 1 ? 'tester' : 'testers'} ·{' '}
              {testerMetrics.testerBookingsCount} tester{' '}
              {testerMetrics.testerBookingsCount === 1 ? 'ticket' : 'tickets'} synced
            </span>
          </div>
          {testerMetrics.testerEmails.length > 0 && (
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-md">
              Testers: {testerMetrics.testerEmails.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#0D1526] border border-[#1E2E4E] rounded-lg w-fit">
        {(
          [
            { id: 'analytics', label: 'Reception & Analytics' },
            { id: 'events', label: `Event Stream (${events.length})` },
            { id: 'schema', label: 'DB Schema & Contracts' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-[#004D98] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'analytics' && (
        <div className="space-y-6">
          {/* Primary KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-5">
              <div className="text-xs text-slate-400">Gross Revenue</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#EDBB00] tabular-nums">
                Rs.{analytics.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                Avg Rs.{analytics.avgFare.toLocaleString('en-IN')} / pax
              </div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-5">
              <div className="text-xs text-slate-400">Cabin Load Factor</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                {analytics.loadFactorPct}%
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                {analytics.bookedSeatsCount} / 180 seats booked
              </div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-5">
              <div className="text-xs text-slate-400">Seat Pref. Match</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                {analytics.preferenceFulfillmentPct}%
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                {analytics.totalBookings} active tickets
              </div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-5">
              <div className="text-xs text-slate-400">Razorpay Auth Rate</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#60A5FA] tabular-nums">
                {analytics.paymentSuccessPct}%
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                {analytics.authorizedPayments} ok · {analytics.declinedPayments}{' '}
                declined
              </div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-5">
              <div className="text-xs text-slate-400">Fuel Yield / Cancels</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                Rs.{analytics.totalFuelCollected.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                {analytics.cancellationRatePct}% cancel ·{' '}
                {analytics.searchesCount} lookups
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Carrier Reception Table */}
            <section className="lg:col-span-7 bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1E2E4E] flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Carrier Reception & Revenue Share ({AIRLINES.length} Airlines)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Demand & distance tariff distribution across global carriers
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[430px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#121D33]">
                    <tr className="border-b border-[#1E2E4E] text-xs font-semibold text-slate-300">
                      <th className="py-3 px-5">Carrier</th>
                      <th className="py-3 px-5 text-right">Tickets</th>
                      <th className="py-3 px-5 text-right">Share</th>
                      <th className="py-3 px-5 text-right">Avg Dist.</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2E4E]/80 text-sm">
                    {analytics.carrierStats.map((c) => (
                      <tr key={c.code} className="hover:bg-[#121D33]/70">
                        <td className="py-3 px-5">
                          <div className="font-medium text-white">
                            {c.name}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {c.code} · {c.cruiseSpeedKmh} km/h · Rs.{c.ratePerKm}/km
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-200 tabular-nums">
                          {c.count}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-400 tabular-nums">
                          {c.sharePct}%
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-400 tabular-nums">
                          {c.avgDistance > 0
                            ? `${c.avgDistance.toLocaleString('en-IN')} km`
                            : '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-semibold text-[#EDBB00] tabular-nums">
                          Rs.{c.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right Column: Payment Methods + Seat Utilization + Blaugrana Palette */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Razorpay Method Reception
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Checkout volume split by payment instrument
                  </p>
                </div>

                <div className="space-y-3">
                  {analytics.paymentMethods.map((pm) => (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">
                          {pm.method}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {pm.count} txns · Rs.
                          {pm.volume.toLocaleString('en-IN')} ({pm.sharePct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#0A1120] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#004D98] to-[#A50044] transition-all"
                          style={{ width: `${pm.sharePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Cabin Seat-Type Utilization
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Occupancy across 60 seats per class (180 total)
                  </p>
                </div>

                <div className="space-y-3">
                  {analytics.seatTypes.map((st) => (
                    <div key={st.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">
                          {st.type}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {st.booked} / {st.total} ({st.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#0A1120] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EDBB00] transition-all"
                          style={{ width: `${st.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#EDBB00]" />
                  <h2 className="font-display text-base font-semibold text-white">
                    Isometric Blaugrana Palette Spec
                  </h2>
                </div>
                <div className="space-y-2">
                  {BLAUGRANA_PALETTE_TOKENS.map((tok) => (
                    <div
                      key={tok.hex}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded border border-white/20 shrink-0"
                          style={{ backgroundColor: tok.hex }}
                        />
                        <span className="font-medium text-slate-200 truncate">
                          {tok.name}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {tok.hex}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Top Booked Routes */}
          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E2E4E] flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Route Corridor Demand
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Most booked origin-destination corridors across the{' '}
                  {AIRPORTS.length}-airport network
                </p>
              </div>
            </div>

            {analytics.topRoutes.length === 0 ? (
              <div className="px-6 py-10 text-center text-xs text-slate-400">
                No routes booked yet. Create a ticket or seed sample bookings to
                populate corridor telemetry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E2E4E] bg-[#121D33] text-xs font-semibold text-slate-300">
                      <th className="py-3 px-5">Corridor</th>
                      <th className="py-3 px-5 text-right">Distance</th>
                      <th className="py-3 px-5 text-right">Passengers</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2E4E]/80 text-sm">
                    {analytics.topRoutes.map((r) => (
                      <tr key={r.route} className="hover:bg-[#121D33]/70">
                        <td className="py-3 px-5 font-mono font-semibold text-white">
                          {r.route}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-400 tabular-nums">
                          {r.distanceKm > 0
                            ? `${r.distanceKm.toLocaleString('en-IN')} km`
                            : '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-200 tabular-nums">
                          {r.count}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-semibold text-[#EDBB00] tabular-nums">
                          Rs.{r.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {subTab === 'events' && (
        <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1E2E4E] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#EDBB00]" />
              <h2 className="font-display text-base font-semibold text-white">
                Application Event Stream
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter event type"
                value={eventFilter}
                onChange={(e) =>
                  setEventFilter(e.target.value as 'ALL' | AppEventType)
                }
                className="px-3 py-1.5 text-xs bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white focus:outline-none focus:border-[#1C6DD0]"
              >
                <option value="ALL">All Events ({events.length})</option>
                <option value="BOOKING_CREATED">BOOKING_CREATED</option>
                <option value="PAYMENT_AUTHORIZED">PAYMENT_AUTHORIZED</option>
                <option value="PAYMENT_DECLINED">PAYMENT_DECLINED</option>
                <option value="TICKET_CANCELLED">TICKET_CANCELLED</option>
                <option value="TICKET_SEARCHED">TICKET_SEARCHED</option>
                <option value="SESSION_BOOT">SESSION_BOOT</option>
              </select>

              {events.length > 0 && (
                <button
                  type="button"
                  onClick={onClearEvents}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0A1120] border border-[#1E2E4E] hover:text-[#FF4D88] hover:border-[#A50044] rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-slate-400">
              No events recorded for this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-[#1E2E4E]/80">
              {filteredEvents.map((ev) => {
                const isExpanded = expandedEventId === ev.id;
                const typeColor =
                  ev.type === 'PAYMENT_DECLINED' ||
                  ev.type === 'TICKET_CANCELLED'
                    ? 'text-[#FF4D88]'
                    : ev.type === 'PAYMENT_AUTHORIZED' ||
                        ev.type === 'BOOKING_CREATED'
                      ? 'text-emerald-400'
                      : 'text-[#60A5FA]';

                return (
                  <div key={ev.id} className="px-6 py-3.5 hover:bg-[#121D33]/60">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : ev.id)
                      }
                      className="w-full text-left flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span
                          className={`font-mono text-xs font-semibold shrink-0 ${typeColor}`}
                        >
                          {ev.type}
                        </span>
                        {ev.actorRole && (
                          <span
                            className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                              ev.actorRole === 'tester'
                                ? 'border-[#EDBB00]/50 text-[#EDBB00] bg-[#EDBB00]/10'
                                : 'border-[#1C6DD0]/50 text-[#60A5FA] bg-[#004D98]/20'
                            }`}
                          >
                            {ev.actorRole === 'tester'
                              ? ev.actorEmail ?? 'Tester'
                              : 'Dev'}
                          </span>
                        )}
                        <span className="text-xs text-slate-200 truncate">
                          {ev.summary}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </button>

                    {isExpanded && ev.metadata && (
                      <pre className="mt-3 ml-7 p-3.5 rounded-lg bg-[#0A1120] border border-[#1E2E4E] text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(ev.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {subTab === 'schema' && (
        <div className="space-y-6">
          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E2E4E] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#EDBB00]" />
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Relational Database DDL Contract
                  </h2>
                  <p className="text-xs text-slate-400">
                    Extended with dynamic Fuel_Surcharge, Distance_Charge, and
                    Airport_Taxes columns
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-[#0A1120] border border-[#1E2E4E] hover:bg-[#121D33] rounded-lg transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied SQL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-6 text-xs font-mono text-slate-300 bg-[#0A1120] overflow-x-auto leading-relaxed">
              {BACKEND_SCHEMA_SQL}
            </pre>
          </section>

          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              Suggested REST API Endpoints for Backend Sync
            </h2>
            <div className="divide-y divide-[#1E2E4E] text-xs font-mono">
              {[
                {
                  method: 'POST',
                  path: '/api/v1/bookings',
                  desc: 'Atomic multi-passenger seat allocation, dynamic fuel/distance pricing, and Razorpay verification',
                },
                {
                  method: 'GET',
                  path: '/api/v1/bookings?bookingId=...&name=...',
                  desc: 'Lookup by Booking_ID or Name_of_Ticketholder with last-4-digit disambiguation',
                },
                {
                  method: 'DELETE',
                  path: '/api/v1/bookings/:bookingId',
                  desc: 'Delete booking record and release Seat_Booked back to Is_Booked = FALSE',
                },
                {
                  method: 'GET',
                  path: '/api/v1/analytics/reception',
                  desc: 'Aggregated revenue, fuel yield, cabin load factor, carrier share, and event telemetry',
                },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#EDBB00] w-14 shrink-0">
                      {ep.method}
                    </span>
                    <span className="text-white">{ep.path}</span>
                  </div>
                  <span className="font-sans text-slate-400">{ep.desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
