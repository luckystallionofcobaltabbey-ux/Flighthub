import { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  Trash2,
} from 'lucide-react';
import { AIRLINES, AIRPORTS } from '../data/airlines';
import {
  AppEventRecord,
  AppEventType,
  BookingRecord,
  PaymentMethod,
  SeatRecord,
} from '../types/flighthub';

interface DeveloperPortalViewProps {
  bookings: BookingRecord[];
  seats: SeatRecord[];
  events: AppEventRecord[];
  onLoadSampleData: () => void;
  onClearEvents: () => void;
}

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
  onLoadSampleData,
  onClearEvents,
}: DeveloperPortalViewProps) {
  const [subTab, setSubTab] = useState<PortalSubTab>('analytics');
  const [eventFilter, setEventFilter] = useState<'ALL' | AppEventType>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const analytics = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.fare, 0);
    const totalBookings = bookings.length;
    const avgFare = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

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

    // Carrier Reception Breakdown
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
      airportNetworkCount: AIRPORTS.length,
      summary: {
        totalRevenue: analytics.totalRevenue,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Backend Developer Portal
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Live app reception metrics, Razorpay checkout telemetry, cabin load
            analytics, and database schema contracts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {bookings.length === 0 && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="px-3.5 py-2 text-xs font-medium text-zinc-200 bg-[#18181B] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Seed Sample Bookings
            </button>
          )}
          <button
            type="button"
            onClick={handleExportSnapshot}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics JSON</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#18181B] border border-zinc-800 rounded-lg w-fit">
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
                ? 'bg-[#E50914] text-white'
                : 'text-zinc-400 hover:text-white'
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
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Gross Revenue</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                Rs.{analytics.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                Avg Rs.{analytics.avgFare.toLocaleString('en-IN')} / pax
              </div>
            </div>

            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Cabin Load Factor</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                {analytics.loadFactorPct}%
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                {analytics.bookedSeatsCount} / 180 seats booked
              </div>
            </div>

            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Seat Pref. Match</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                {analytics.preferenceFulfillmentPct}%
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                {analytics.totalBookings} active tickets
              </div>
            </div>

            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Razorpay Auth Rate</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                {analytics.paymentSuccessPct}%
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                {analytics.authorizedPayments} ok · {analytics.declinedPayments}{' '}
                declined
              </div>
            </div>

            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Cancellation Rate</div>
              <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                {analytics.cancellationRatePct}%
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
                {analytics.cancellationsCount} cancelled ·{' '}
                {analytics.searchesCount} lookups
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Carrier Reception Table */}
            <section className="lg:col-span-7 bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Carrier Reception & Revenue Share
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Demand distribution across the 6 partner airlines
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#1F1F23] text-xs font-semibold text-zinc-400">
                      <th className="py-3 px-5">Carrier</th>
                      <th className="py-3 px-5 text-right">Tickets</th>
                      <th className="py-3 px-5 text-right">Share</th>
                      <th className="py-3 px-5 text-right">Avg Dist.</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-sm">
                    {analytics.carrierStats.map((c) => (
                      <tr key={c.code} className="hover:bg-zinc-900/60">
                        <td className="py-3 px-5">
                          <div className="font-medium text-white">
                            {c.name}
                          </div>
                          <div className="text-xs font-mono text-zinc-500">
                            {c.code} · {c.cruiseSpeedKmh} km/h
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-zinc-200 tabular-nums">
                          {c.count}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-zinc-400 tabular-nums">
                          {c.sharePct}%
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-zinc-400 tabular-nums">
                          {c.avgDistance > 0
                            ? `${c.avgDistance.toLocaleString('en-IN')} km`
                            : '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-semibold text-white tabular-nums">
                          Rs.{c.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right Column: Payment Methods + Seat Utilization */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Razorpay Method Reception
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Checkout volume split by payment instrument
                  </p>
                </div>

                <div className="space-y-3">
                  {analytics.paymentMethods.map((pm) => (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">
                          {pm.method}
                        </span>
                        <span className="font-mono text-zinc-400 tabular-nums">
                          {pm.count} txns · Rs.
                          {pm.volume.toLocaleString('en-IN')} ({pm.sharePct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E50914] transition-all"
                          style={{ width: `${pm.sharePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Cabin Seat-Type Utilization
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Occupancy across 60 seats per class (180 total)
                  </p>
                </div>

                <div className="space-y-3">
                  {analytics.seatTypes.map((st) => (
                    <div key={st.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">
                          {st.type}
                        </span>
                        <span className="font-mono text-zinc-400 tabular-nums">
                          {st.booked} / {st.total} ({st.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${st.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Top Booked Routes */}
          <section className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Route Corridor Demand
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Most booked origin-destination corridors across the{' '}
                  {AIRPORTS.length}-airport network
                </p>
              </div>
            </div>

            {analytics.topRoutes.length === 0 ? (
              <div className="px-6 py-10 text-center text-xs text-zinc-400">
                No routes booked yet. Create a ticket or seed sample bookings to
                populate corridor telemetry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#1F1F23] text-xs font-semibold text-zinc-400">
                      <th className="py-3 px-5">Corridor</th>
                      <th className="py-3 px-5 text-right">Distance</th>
                      <th className="py-3 px-5 text-right">Passengers</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-sm">
                    {analytics.topRoutes.map((r) => (
                      <tr key={r.route} className="hover:bg-zinc-900/60">
                        <td className="py-3 px-5 font-mono font-semibold text-white">
                          {r.route}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-zinc-400 tabular-nums">
                          {r.distanceKm > 0
                            ? `${r.distanceKm.toLocaleString('en-IN')} km`
                            : '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-zinc-200 tabular-nums">
                          {r.count}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-semibold text-white tabular-nums">
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
        <section className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#E50914]" />
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
                className="px-3 py-1.5 text-xs bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914]"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-[#111114] border border-zinc-700 hover:text-red-300 hover:border-red-900 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-zinc-400">
              No events recorded for this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filteredEvents.map((ev) => {
                const isExpanded = expandedEventId === ev.id;
                const typeColor =
                  ev.type === 'PAYMENT_DECLINED' ||
                  ev.type === 'TICKET_CANCELLED'
                    ? 'text-[#E50914]'
                    : ev.type === 'PAYMENT_AUTHORIZED' ||
                        ev.type === 'BOOKING_CREATED'
                      ? 'text-emerald-400'
                      : 'text-zinc-300';

                return (
                  <div key={ev.id} className="px-6 py-3.5 hover:bg-zinc-900/40">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : ev.id)
                      }
                      className="w-full text-left flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                        <span
                          className={`font-mono text-xs font-semibold shrink-0 ${typeColor}`}
                        >
                          {ev.type}
                        </span>
                        <span className="text-xs text-zinc-200 truncate">
                          {ev.summary}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] text-zinc-500 tabular-nums shrink-0">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </button>

                    {isExpanded && ev.metadata && (
                      <pre className="mt-3 ml-7 p-3.5 rounded-lg bg-[#111114] border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
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
          <section className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#E50914]" />
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Relational Database DDL Contract
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Extended from the original Python MySQL schema for backend
                    API integration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors"
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

            <pre className="p-6 text-xs font-mono text-zinc-300 bg-[#111114] overflow-x-auto leading-relaxed">
              {BACKEND_SCHEMA_SQL}
            </pre>
          </section>

          <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              Suggested REST API Endpoints for Backend Sync
            </h2>
            <div className="divide-y divide-zinc-800 text-xs font-mono">
              {[
                {
                  method: 'POST',
                  path: '/api/v1/bookings',
                  desc: 'Atomic multi-passenger seat allocation + Razorpay order/payment verification',
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
                  desc: 'Aggregated revenue, cabin load factor, carrier share, and event telemetry',
                },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#E50914] w-14 shrink-0">
                      {ep.method}
                    </span>
                    <span className="text-white">{ep.path}</span>
                  </div>
                  <span className="font-sans text-zinc-400">{ep.desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
