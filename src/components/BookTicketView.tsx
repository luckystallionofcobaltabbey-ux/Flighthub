import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Cloud,
  Fuel,
  LogIn,
  Minus,
  Plus,
  Star,
  X,
} from 'lucide-react';
import {
  AIRLINES,
  AIRPORTS,
  AVAILABLE_TIMES,
  SEAT_PREFERENCES,
} from '../data/airlines';
import {
  Airline,
  BookingRecord,
  FleetTier,
  PassengerDraft,
  PaymentDetails,
  PaymentMethod,
  SeatPreference,
  SeatRecord,
} from '../types/flighthub';
import {
  calculateDynamicFare,
  calculateRouteMetrics,
  computeFlightTimes,
  formatDisplayDateTime,
  getTodayDateString,
} from '../utils/flightEngine';
import { AirportSelector } from './AirportSelector';
import { IsometricBlaugranaBackdrop } from './IsometricMotif';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import { TicketCard } from './TicketCard';

interface BookTicketViewProps {
  seats: SeatRecord[];
  preselectedAirlineCode?: string | null;
  authReady: boolean;
  isCloudSignedIn: boolean;
  syncBusy: boolean;
  onSignInCloud: () => Promise<boolean>;
  onConfirmBooking: (params: {
    airline: Airline;
    departureAirport: string;
    arrivalAirport: string;
    travelDate: string;
    departureTime: string;
    passengers: PassengerDraft[];
    payment: PaymentDetails;
  }) => BookingRecord[];
  onPaymentAttempt?: (attempt: {
    status: 'authorized' | 'declined';
    method: PaymentMethod;
    amount: number;
    orderId: string;
    referenceId?: string;
  }) => void;
  onNavigateToView: () => void;
  onNavigateToSeats: () => void;
}

const FLEET_FILTERS: Array<'All' | FleetTier> = [
  'All',
  'Regional Shuttle',
  'Narrowbody Jet',
  'Widebody Long-Haul',
  'Flagship Twin-Aisle',
];

function createPassenger(index: number): PassengerDraft {
  return {
    id: `pax-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    citizenship: '',
    preference: 'Window',
  };
}

export function BookTicketView({
  seats,
  preselectedAirlineCode,
  authReady,
  isCloudSignedIn,
  syncBusy,
  onSignInCloud,
  onConfirmBooking,
  onPaymentAttempt,
  onNavigateToView,
  onNavigateToSeats,
}: BookTicketViewProps) {
  const initialAirline =
    AIRLINES.find((a) => a.code === preselectedAirlineCode) ?? AIRLINES[0];

  const [departureAirport, setDepartureAirport] = useState('DEL');
  const [arrivalAirport, setArrivalAirport] = useState('BCN');
  const [selectedAirlineCode, setSelectedAirlineCode] = useState(
    initialAirline.code
  );
  const [tierFilter, setTierFilter] = useState<'All' | FleetTier>('All');
  const [travelDate, setTravelDate] = useState(getTodayDateString);
  const [departureTime, setDepartureTime] = useState(AVAILABLE_TIMES[1]);
  const [passengers, setPassengers] = useState<PassengerDraft[]>([
    createPassenger(1),
  ]);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedTickets, setConfirmedTickets] = useState<
    BookingRecord[] | null
  >(null);

  const selectedAirline =
    AIRLINES.find((a) => a.code === selectedAirlineCode) ?? AIRLINES[0];

  const seatCounts = useMemo(() => {
    const open = seats.filter((s) => !s.isBooked);
    return {
      totalOpen: open.length,
      window: open.filter((s) => s.seatType === 'Window').length,
      middle: open.filter((s) => s.seatType === 'Middle').length,
      aisle: open.filter((s) => s.seatType === 'Aisle').length,
    };
  }, [seats]);

  const routeMetrics = useMemo(
    () =>
      calculateRouteMetrics(
        departureAirport,
        arrivalAirport,
        selectedAirline.cruiseSpeedKmh
      ),
    [departureAirport, arrivalAirport, selectedAirline.cruiseSpeedKmh]
  );

  const fareBreakdown = useMemo(
    () =>
      calculateDynamicFare(selectedAirline, departureAirport, arrivalAirport),
    [selectedAirline, departureAirport, arrivalAirport]
  );

  const filteredAirlines = useMemo(() => {
    if (tierFilter === 'All') return AIRLINES;
    return AIRLINES.filter((a) => a.fleetTier === tierFilter);
  }, [tierFilter]);

  const flightTimes = useMemo(() => {
    if (!travelDate || !departureTime) return null;
    return computeFlightTimes(
      travelDate,
      departureTime,
      departureAirport,
      arrivalAirport,
      selectedAirline.cruiseSpeedKmh
    );
  }, [
    travelDate,
    departureTime,
    departureAirport,
    arrivalAirport,
    selectedAirline.cruiseSpeedKmh,
  ]);

  const farePerPassenger = fareBreakdown.totalFare;
  const totalFare = farePerPassenger * passengers.length;

  const handlePassengerCountChange = (nextCount: number) => {
    const clamped = Math.max(1, Math.min(9, nextCount));
    setErrorMsg(null);
    setPassengers((prev) => {
      if (clamped === prev.length) return prev;
      if (clamped < prev.length) return prev.slice(0, clamped);
      const additions = Array.from(
        { length: clamped - prev.length },
        (_, i) => createPassenger(prev.length + i + 1)
      );
      return [...prev, ...additions];
    });
  };

  const updatePassenger = (
    id: string,
    patch: Partial<Omit<PassengerDraft, 'id'>>
  ) => {
    setErrorMsg(null);
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleSwapAirports = () => {
    setDepartureAirport(arrivalAirport);
    setArrivalAirport(departureAirport);
    setErrorMsg(null);
  };

  const validateForm = (): string | null => {
    const dep = departureAirport.trim().toUpperCase();
    const arr = arrivalAirport.trim().toUpperCase();

    if (dep.length < 2) return 'Select a valid departure airport.';
    if (arr.length < 2) return 'Select a valid arrival airport.';
    if (dep === arr) {
      return 'Departure and arrival airports must be different.';
    }
    if (!travelDate || !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      return 'Enter a valid travel date (YYYY-MM-DD).';
    }
    if (seatCounts.totalOpen < passengers.length) {
      return `Not enough seats available (${seatCounts.totalOpen} open, ${passengers.length} requested).`;
    }

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim()) {
        return `Enter full name for Passenger ${i + 1}.`;
      }
      if (!p.citizenship.trim()) {
        return `Enter citizenship/nationality for Passenger ${i + 1}.`;
      }
    }
    return null;
  };

  const handleOpenRazorpay = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    if (authReady && !isCloudSignedIn) {
      setSignInPromptOpen(true);
      return;
    }
    setRazorpayOpen(true);
  };

  const handleSignInAndContinue = async () => {
    const signedIn = await onSignInCloud();
    if (signedIn) {
      setSignInPromptOpen(false);
      setRazorpayOpen(true);
    }
  };

  const handleContinueLocalMode = () => {
    setSignInPromptOpen(false);
    setRazorpayOpen(true);
  };

  const handlePaymentSuccess = (payment: PaymentDetails) => {
    setRazorpayOpen(false);
    try {
      const created = onConfirmBooking({
        airline: selectedAirline,
        departureAirport: departureAirport.trim().toUpperCase(),
        arrivalAirport: arrivalAirport.trim().toUpperCase(),
        travelDate,
        departureTime,
        passengers,
        payment,
      });
      setConfirmedTickets(created);
      setErrorMsg(null);
    } catch (errObj) {
      setErrorMsg(
        errObj instanceof Error ? errObj.message : 'Booking failed.'
      );
    }
  };

  const handleResetForNewBooking = () => {
    setConfirmedTickets(null);
    setErrorMsg(null);
    setPassengers([createPassenger(1)]);
  };

  if (confirmedTickets) {
    const paidTotal = confirmedTickets.reduce((sum, t) => sum + t.fare, 0);
    const first = confirmedTickets[0];

    return (
      <div className="space-y-6">
        <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#1E2E4E]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                  Booking Confirmed
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {confirmedTickets.length}{' '}
                  {confirmedTickets.length === 1 ? 'ticket' : 'tickets'} issued
                  on {first.airline} · {first.departureAirport} to{' '}
                  {first.arrivalAirport}
                  {first.payment
                    ? ` · Razorpay ${first.payment.referenceId}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onNavigateToSeats}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#0A1120] border border-[#1E2E4E] hover:bg-[#121D33] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Cabin Map
              </button>
              <button
                type="button"
                onClick={onNavigateToView}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#0A1120] border border-[#1E2E4E] hover:bg-[#121D33] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                View All Tickets
              </button>
              <button
                type="button"
                onClick={handleResetForNewBooking}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Book Another Flight
              </button>
            </div>
          </div>

          <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-400">Departure (Local)</div>
              <div className="mt-0.5 font-mono font-semibold text-white">
                {first.departureAirport} ·{' '}
                {formatDisplayDateTime(
                  first.departureDateTime,
                  first.departureTzLabel
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Arrival (Local)</div>
              <div className="mt-0.5 font-mono font-semibold text-white">
                {first.arrivalAirport} ·{' '}
                {formatDisplayDateTime(
                  first.arrivalDateTime,
                  first.arrivalTzLabel
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Fare per Passenger</div>
              <div className="mt-0.5 font-mono font-semibold text-white tabular-nums">
                Rs.{first.fare.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Paid</div>
              <div className="mt-0.5 font-mono text-base font-bold text-[#EDBB00] tabular-nums">
                Rs.{paidTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {confirmedTickets.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RazorpayCheckoutModal
        isOpen={razorpayOpen}
        totalAmount={totalFare}
        passengerCount={passengers.length}
        routeLabel={`${departureAirport} → ${arrivalAirport}`}
        airlineName={selectedAirline.name}
        defaultHolderName={passengers[0]?.name.trim() || ''}
        onClose={() => setRazorpayOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentAttempt={onPaymentAttempt}
      />

      {signInPromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-before-booking-title"
        >
          <div className="w-full max-w-md bg-[#0D1526] border border-[#1E2E4E] iso-depth rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#004D98]/30 border border-[#1C6DD0]/60 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-[#EDBB00]" />
                </div>
                <div>
                  <h2
                    id="signin-before-booking-title"
                    className="font-display text-lg font-bold text-white"
                  >
                    Sign in before booking
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Sign in with Google before checkout so your seats reserve
                    globally and your booking syncs to Firebase and the Developer
                    Portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignInPromptOpen(false)}
                aria-label="Close sign-in prompt"
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void handleSignInAndContinue()}
                disabled={syncBusy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-[#004D98] to-[#A50044] hover:from-[#1C6DD0] hover:to-[#BE0A54] rounded-xl transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <LogIn className="w-4 h-4 text-[#EDBB00]" />
                <span>
                  {syncBusy
                    ? 'Connecting to Google...'
                    : 'Sign In with Google & Pay'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleContinueLocalMode}
                disabled={syncBusy}
                className="w-full py-2 px-4 text-xs font-medium text-slate-300 hover:text-white bg-[#0A1120] border border-[#1E2E4E] hover:border-[#1C6DD0] rounded-xl transition-colors"
              >
                Continue without signing in (local device only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isometric Blaugrana Hero Banner */}
      <div className="relative rounded-xl overflow-hidden border border-[#1E2E4E] bg-[#0D1526] iso-depth">
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-[#002855] via-[#0D1526] to-[#4A001E]">
          <img
            src="/src/assets/images/gta_flighthub_tarmac_1795633890408.jpg"
            alt="FlightHub Lmtd night tarmac operations"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-40"
          />
          <IsometricBlaugranaBackdrop className="absolute right-0 inset-y-0 h-full w-auto opacity-85 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070B14] via-[#070B14]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-black/25" />

          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
            <div className="max-w-2xl">
              <div className="text-xs font-mono font-semibold text-[#EDBB00] tracking-wide">
                FlightHub Lmtd · {AIRLINES.length} Carriers · {AIRPORTS.length}{' '}
                Global Airports
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 text-balance">
                Book Your Next Departure
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                {seatCounts.totalOpen} of 180 seats open · Window{' '}
                {seatCounts.window} · Middle {seatCounts.middle} · Aisle{' '}
                {seatCounts.aisle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {authReady && !isCloudSignedIn && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-[#0D1526] border border-[#1C6DD0]/70 rounded-xl">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
            <Cloud className="w-4 h-4 text-[#EDBB00] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Sign in before booking</strong>{' '}
              with Google to sync your tickets to Firebase across devices.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onSignInCloud()}
            disabled={syncBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#004D98] hover:bg-[#1C6DD0] rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <LogIn className="w-3.5 h-3.5 text-[#EDBB00]" />
            <span>{syncBusy ? 'Connecting...' : 'Sign In with Google'}</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 text-sm text-rose-100 bg-[#A50044]/25 border border-[#A50044] rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-[#FF4D88] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleOpenRazorpay}
          className="lg:col-span-8 space-y-6"
        >
          {/* 1. Route & Location-Aware Schedule */}
          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-white">
                01. Route & Travel Window
              </h2>
              {routeMetrics.distanceKm > 0 && (
                <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#EDBB00]" />
                  <span>
                    {routeMetrics.distanceKm.toLocaleString('en-IN')} km ·{' '}
                    {routeMetrics.durationFormatted} flight
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <AirportSelector
                id="dep-airport"
                label="Departure Airport"
                value={departureAirport}
                excludeCode={arrivalAirport}
                onChange={(code) => {
                  setDepartureAirport(code);
                  setErrorMsg(null);
                }}
              />

              <button
                type="button"
                onClick={handleSwapAirports}
                aria-label="Swap departure and arrival airports"
                className="h-[42px] px-3 inline-flex items-center justify-center border border-[#1E2E4E] bg-[#0A1120] rounded-lg text-slate-300 hover:text-white hover:border-[#1C6DD0] hover:bg-[#121D33] transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <AirportSelector
                id="arr-airport"
                label="Arrival Airport"
                value={arrivalAirport}
                excludeCode={departureAirport}
                onChange={(code) => {
                  setArrivalAirport(code);
                  setErrorMsg(null);
                }}
              />
            </div>

            {flightTimes && (
              <div className="px-4 py-3 rounded-lg bg-[#0A1120] border border-[#1E2E4E] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-300">
                  <span className="font-semibold text-white">
                    {routeMetrics.depAirport?.city ?? departureAirport}
                  </span>{' '}
                  ({flightTimes.departureTzLabel}) →{' '}
                  <span className="font-semibold text-white">
                    {routeMetrics.arrAirport?.city ?? arrivalAirport}
                  </span>{' '}
                  ({flightTimes.arrivalTzLabel})
                </div>
                <div className="font-mono text-slate-300 tabular-nums">
                  Est. Arrival:{' '}
                  <span className="text-white font-semibold">
                    {formatDisplayDateTime(
                      flightTimes.arrivalDateTime,
                      flightTimes.arrivalTzLabel
                    )}
                  </span>
                  {flightTimes.dayOffset > 0 && (
                    <span className="text-[#EDBB00] ml-1.5">
                      (+{flightTimes.dayOffset}d)
                    </span>
                  )}
                  {flightTimes.dayOffset < 0 && (
                    <span className="text-[#60A5FA] ml-1.5">
                      ({flightTimes.dayOffset}d)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-[#1E2E4E]">
              <div>
                <label
                  htmlFor="travel-date"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Travel Date (Departure Local)
                </label>
                <input
                  id="travel-date"
                  type="date"
                  value={travelDate}
                  onChange={(e) => {
                    setTravelDate(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1.5">
                  Departure Window ({routeMetrics.durationFormatted} flight)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_TIMES.map((t) => {
                    const active = departureTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDepartureTime(t)}
                        className={`py-2 px-2 text-xs font-mono font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                          active
                            ? 'bg-[#A50044] text-white border-[#CF115D]'
                            : 'bg-[#0A1120] text-slate-300 border-[#1E2E4E] hover:border-[#1C6DD0] hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Carrier Selection (18 Non-Copyrightable Real-World Geographic Airlines + Dynamic Pricing) */}
          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  02. Select Carrier ({AIRLINES.length} Airlines)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live fares vary per carrier by route distance, Jet-A1 fuel
                  burn, wind factor, and airport taxes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0A1120] border border-[#1E2E4E] rounded-lg w-fit">
              {FLEET_FILTERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    tierFilter === tier
                      ? 'bg-[#004D98] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredAirlines.map((airline) => {
                const isSelected = airline.code === selectedAirlineCode;
                const carrierMetrics = calculateRouteMetrics(
                  departureAirport,
                  arrivalAirport,
                  airline.cruiseSpeedKmh
                );
                const carrierFare = calculateDynamicFare(
                  airline,
                  departureAirport,
                  arrivalAirport
                );
                return (
                  <button
                    key={airline.code}
                    type="button"
                    onClick={() => setSelectedAirlineCode(airline.code)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-[#1C6DD0] bg-gradient-to-br from-[#004D98]/35 to-[#A50044]/25 ring-1 ring-[#1C6DD0]'
                        : 'border-[#1E2E4E] bg-[#0A1120] hover:border-[#1C6DD0]/60 hover:bg-[#121D33]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {airline.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {airline.hubCity} · {airline.fleetTier}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono tabular-nums">
                          <span className="text-[#60A5FA] font-semibold">
                            {airline.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[#EDBB00] text-[#EDBB00]" />
                            {airline.rating.toFixed(1)}
                          </span>
                          {carrierMetrics.distanceKm > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{carrierMetrics.durationFormatted}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-bold text-[#EDBB00] tabular-nums">
                          Rs.{carrierFare.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 tabular-nums mt-0.5">
                          Fuel: Rs.
                          {carrierFare.fuelSurcharge.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Passengers & Seat Preferences */}
          <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E2E4E]">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  03. Passengers & Seat Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preferred seats are allocated from Row 1 forward; falls back
                  to next open seat if unavailable.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  Passengers
                </span>
                <div className="inline-flex items-center border border-[#1E2E4E] rounded-lg bg-[#0A1120]">
                  <button
                    type="button"
                    onClick={() =>
                      handlePassengerCountChange(passengers.length - 1)
                    }
                    disabled={passengers.length <= 1}
                    aria-label="Decrease passengers"
                    className="p-2 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-semibold text-white tabular-nums">
                    {passengers.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handlePassengerCountChange(passengers.length + 1)
                    }
                    disabled={passengers.length >= 9}
                    aria-label="Increase passengers"
                    className="p-2 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#1E2E4E]">
              {passengers.map((pax, idx) => (
                <div
                  key={pax.id}
                  className="py-4 first:pt-0 last:pb-0 space-y-3"
                >
                  <div className="text-xs font-semibold text-[#60A5FA]">
                    Passenger {idx + 1}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor={`pax-name-${pax.id}`}
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id={`pax-name-${pax.id}`}
                        type="text"
                        value={pax.name}
                        onChange={(e) =>
                          updatePassenger(pax.id, { name: e.target.value })
                        }
                        placeholder="e.g. Aarav Mehta"
                        className="w-full px-3 py-2 text-sm bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`pax-cit-${pax.id}`}
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Citizenship / Nationality
                      </label>
                      <input
                        id={`pax-cit-${pax.id}`}
                        type="text"
                        value={pax.citizenship}
                        onChange={(e) =>
                          updatePassenger(pax.id, {
                            citizenship: e.target.value,
                          })
                        }
                        placeholder="e.g. Indian"
                        className="w-full px-3 py-2 text-sm bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`pax-pref-${pax.id}`}
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Seat Preference
                      </label>
                      <select
                        id={`pax-pref-${pax.id}`}
                        value={pax.preference}
                        onChange={(e) =>
                          updatePassenger(pax.id, {
                            preference: e.target.value as SeatPreference,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
                      >
                        {SEAT_PREFERENCES.map((pref) => (
                          <option key={pref} value={pref}>
                            {pref}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] iso-depth-sm rounded-lg transition-colors whitespace-nowrap"
            >
              Pay Rs.{totalFare.toLocaleString('en-IN')} with Razorpay
            </button>
          </div>
        </form>

        {/* Right Summary Column with Distance & Fuel Pricing Breakdown */}
        <aside className="lg:col-span-4 bg-[#0D1526] border border-[#1E2E4E] iso-depth rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="pb-4 border-b border-[#1E2E4E]">
            <h2 className="font-display text-base font-semibold text-white">
              Booking & Tariff Summary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamic distance, Jet-A1 fuel & timezone schedule
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Route</dt>
              <dd className="font-mono font-semibold text-[#EDBB00]">
                {departureAirport} → {arrivalAirport}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Distance / Flight Time</dt>
              <dd className="font-mono text-xs text-slate-200 tabular-nums">
                {routeMetrics.distanceKm.toLocaleString('en-IN')} km ·{' '}
                {routeMetrics.durationFormatted}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Airline</dt>
              <dd className="font-medium text-slate-100 text-right">
                {selectedAirline.name} ({selectedAirline.code})
              </dd>
            </div>
            {flightTimes && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Departure</dt>
                  <dd className="font-mono text-xs text-slate-200 tabular-nums text-right">
                    {formatDisplayDateTime(
                      flightTimes.departureDateTime,
                      flightTimes.departureTzLabel
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Arrival</dt>
                  <dd className="font-mono text-xs text-slate-200 tabular-nums text-right">
                    {formatDisplayDateTime(
                      flightTimes.arrivalDateTime,
                      flightTimes.arrivalTzLabel
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>

          <div className="pt-4 border-t border-[#1E2E4E] space-y-2">
            <div className="text-xs font-medium text-slate-400">
              Passengers ({passengers.length})
            </div>
            <ul className="space-y-1.5 text-xs">
              {passengers.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-slate-200"
                >
                  <span className="truncate">
                    {idx + 1}. {p.name.trim() || 'Unnamed passenger'}
                  </span>
                  <span className="text-slate-400 whitespace-nowrap shrink-0">
                    {p.preference}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-[#1E2E4E] space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Base carrier fee</span>
              <span className="font-mono tabular-nums text-slate-200">
                Rs.{fareBreakdown.baseFare.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>
                Distance tariff ({fareBreakdown.distanceKm.toLocaleString('en-IN')}{' '}
                km)
              </span>
              <span className="font-mono tabular-nums text-slate-200">
                Rs.{fareBreakdown.distanceCharge.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-[#EDBB00]" />
                <span>
                  Fuel surcharge (
                  {fareBreakdown.estimatedFuelLitres.toLocaleString('en-IN')} L)
                </span>
              </span>
              <span className="font-mono tabular-nums text-slate-200">
                Rs.{fareBreakdown.fuelSurcharge.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>
                {fareBreakdown.isInternational
                  ? 'Intl. airport & nav fees'
                  : 'Domestic airport fees'}
              </span>
              <span className="font-mono tabular-nums text-slate-200">
                Rs.{fareBreakdown.airportTaxes.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="pt-2 border-t border-[#1E2E4E]/70 flex items-center justify-between text-xs text-slate-300">
              <span>Fare per passenger</span>
              <span className="font-mono font-semibold tabular-nums text-white">
                Rs.{farePerPassenger.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-white pt-1">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums text-[#EDBB00]">
                Rs.{totalFare.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
