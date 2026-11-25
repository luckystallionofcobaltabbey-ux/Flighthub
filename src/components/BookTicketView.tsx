import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Minus,
  Plus,
  Star,
} from 'lucide-react';
import {
  AIRLINES,
  AVAILABLE_TIMES,
  POPULAR_AIRPORTS,
  SEAT_PREFERENCES,
} from '../data/airlines';
import {
  Airline,
  BookingRecord,
  PassengerDraft,
  PaymentDetails,
  SeatPreference,
  SeatRecord,
} from '../types/flighthub';
import {
  computeFlightTimes,
  formatDisplayDateTime,
  getTodayDateString,
} from '../utils/flightEngine';
import { MockPaymentCheckout } from './MockPaymentCheckout';
import { TicketCard } from './TicketCard';

interface BookTicketViewProps {
  seats: SeatRecord[];
  preselectedAirlineCode?: string | null;
  onConfirmBooking: (params: {
    airline: Airline;
    departureAirport: string;
    arrivalAirport: string;
    travelDate: string;
    departureTime: string;
    passengers: PassengerDraft[];
    payment: PaymentDetails;
  }) => BookingRecord[];
  onNavigateToView: () => void;
  onNavigateToSeats: () => void;
}

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
  onConfirmBooking,
  onNavigateToView,
  onNavigateToSeats,
}: BookTicketViewProps) {
  const initialAirline =
    AIRLINES.find((a) => a.code === preselectedAirlineCode) ?? AIRLINES[0];

  const [departureAirport, setDepartureAirport] = useState('DEL');
  const [arrivalAirport, setArrivalAirport] = useState('BOM');
  const [selectedAirlineCode, setSelectedAirlineCode] = useState(
    initialAirline.code
  );
  const [travelDate, setTravelDate] = useState(getTodayDateString);
  const [departureTime, setDepartureTime] = useState(AVAILABLE_TIMES[1]);
  const [passengers, setPassengers] = useState<PassengerDraft[]>([
    createPassenger(1),
  ]);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>(
    'details'
  );
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

  const flightTimes = useMemo(() => {
    if (!travelDate || !departureTime) return null;
    return computeFlightTimes(travelDate, departureTime);
  }, [travelDate, departureTime]);

  const totalFare = selectedAirline.fare * passengers.length;

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

    if (dep.length < 2) return 'Enter a valid departure airport code.';
    if (arr.length < 2) return 'Enter a valid arrival airport code.';
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

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setCheckoutStep('payment');
  };

  const handlePaymentSuccess = (payment: PaymentDetails) => {
    const err = validateForm();
    if (err) {
      setErrorMsg(err);
      setCheckoutStep('details');
      return;
    }
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
      setCheckoutStep('details');
      setErrorMsg(null);
    } catch (errObj) {
      setErrorMsg(
        errObj instanceof Error ? errObj.message : 'Booking failed.'
      );
      setCheckoutStep('details');
    }
  };

  const handleResetForNewBooking = () => {
    setConfirmedTickets(null);
    setCheckoutStep('details');
    setErrorMsg(null);
    setPassengers([createPassenger(1)]);
  };

  if (confirmedTickets) {
    const paidTotal = confirmedTickets.reduce((sum, t) => sum + t.fare, 0);
    const first = confirmedTickets[0];

    return (
      <div className="space-y-6">
        <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-zinc-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                  Booking Confirmed
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {confirmedTickets.length}{' '}
                  {confirmedTickets.length === 1 ? 'ticket' : 'tickets'} issued
                  on {first.airline} · {first.departureAirport} to{' '}
                  {first.arrivalAirport}
                  {first.payment
                    ? ` · Ref ${first.payment.referenceId}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onNavigateToSeats}
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Cabin Map
              </button>
              <button
                type="button"
                onClick={onNavigateToView}
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                View All Tickets
              </button>
              <button
                type="button"
                onClick={handleResetForNewBooking}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Book Another Flight
              </button>
            </div>
          </div>

          <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-xs text-zinc-400">Departure</div>
              <div className="mt-0.5 font-mono font-semibold text-white">
                {first.departureAirport} ·{' '}
                {formatDisplayDateTime(first.departureDateTime)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Arrival</div>
              <div className="mt-0.5 font-mono font-semibold text-white">
                {first.arrivalAirport} ·{' '}
                {formatDisplayDateTime(first.arrivalDateTime)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Fare per Passenger</div>
              <div className="mt-0.5 font-mono font-semibold text-white tabular-nums">
                Rs.{first.fare.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Total Paid</div>
              <div className="mt-0.5 font-mono text-base font-bold text-emerald-400 tabular-nums">
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
      {/* Cinematic Netflix-Style Featured Banner */}
      <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-[#18181B]">
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-[#1A0507] via-[#141414] to-[#18181B]">
          <img
            src="/src/assets/images/gta_flighthub_tarmac_1795633890408.jpg"
            alt="FlightHub Lmtd night tarmac operations"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30" />

          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
            <div className="max-w-2xl">
              <div className="text-xs font-mono font-semibold text-[#E50914] tracking-wide">
                FlightHub Lmtd · Priority Dispatch
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 text-balance">
                Book Your Next Departure
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-300">
                {seatCounts.totalOpen} of 180 seats open · Window{' '}
                {seatCounts.window} · Middle {seatCounts.middle} · Aisle{' '}
                {seatCounts.aisle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-200 bg-red-950/50 border border-red-900/70 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-[#E50914] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Booking Details OR Mock Payment Checkout */}
        <div className="lg:col-span-8">
          {checkoutStep === 'payment' ? (
            <MockPaymentCheckout
              totalAmount={totalFare}
              passengerCount={passengers.length}
              farePerPassenger={selectedAirline.fare}
              defaultHolderName={passengers[0]?.name.trim() || ''}
              onBack={() => setCheckoutStep('details')}
              onPaymentSuccess={handlePaymentSuccess}
            />
          ) : (
            <form onSubmit={handleProceedToPayment} className="space-y-6">
              {/* 1. Route & Schedule */}
              <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-5">
                <h2 className="font-display text-base font-semibold text-white">
                  01. Route & Travel Window
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div>
                    <label
                      htmlFor="dep-airport"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Departure Airport Code
                    </label>
                    <input
                      id="dep-airport"
                      type="text"
                      list="airport-codes"
                      maxLength={5}
                      value={departureAirport}
                      onChange={(e) => {
                        setDepartureAirport(e.target.value.toUpperCase());
                        setErrorMsg(null);
                      }}
                      placeholder="e.g. DEL"
                      className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSwapAirports}
                    aria-label="Swap departure and arrival airports"
                    className="h-[42px] px-3 inline-flex items-center justify-center border border-zinc-700 bg-[#111114] rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>

                  <div>
                    <label
                      htmlFor="arr-airport"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Arrival Airport Code
                    </label>
                    <input
                      id="arr-airport"
                      type="text"
                      list="airport-codes"
                      maxLength={5}
                      value={arrivalAirport}
                      onChange={(e) => {
                        setArrivalAirport(e.target.value.toUpperCase());
                        setErrorMsg(null);
                      }}
                      placeholder="e.g. BOM"
                      className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                    />
                  </div>
                </div>

                <datalist id="airport-codes">
                  {POPULAR_AIRPORTS.map((ap) => (
                    <option key={ap.code} value={ap.code}>
                      {ap.city}
                    </option>
                  ))}
                </datalist>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-zinc-800">
                  <div>
                    <label
                      htmlFor="travel-date"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Travel Date
                    </label>
                    <input
                      id="travel-date"
                      type="date"
                      value={travelDate}
                      onChange={(e) => {
                        setTravelDate(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Departure Time (3h flight)
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
                                ? 'bg-[#E50914] text-white border-[#E50914]'
                                : 'bg-[#111114] text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white'
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

              {/* 2. Airline Selection */}
              <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-base font-semibold text-white">
                    02. Select Carrier
                  </h2>
                  <span className="text-xs text-zinc-400">
                    6 partner airlines
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AIRLINES.map((airline) => {
                    const isSelected = airline.code === selectedAirlineCode;
                    return (
                      <button
                        key={airline.code}
                        type="button"
                        onClick={() => setSelectedAirlineCode(airline.code)}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-[#E50914] bg-[#E50914]/10 ring-1 ring-[#E50914]'
                            : 'border-zinc-800 bg-[#111114] hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {airline.name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
                              <span>Code {airline.code}</span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {airline.rating.toFixed(1)}/5
                              </span>
                            </div>
                          </div>
                          <div className="font-mono text-sm font-bold text-white tabular-nums">
                            Rs.{airline.fare.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 3. Passengers & Seat Preferences */}
              <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div>
                    <h2 className="font-display text-base font-semibold text-white">
                      03. Passengers & Seat Preferences
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Preferred seats are allocated from Row 1 forward; falls
                      back to next open seat if unavailable.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">
                      Passengers
                    </span>
                    <div className="inline-flex items-center border border-zinc-700 rounded-lg bg-[#111114]">
                      <button
                        type="button"
                        onClick={() =>
                          handlePassengerCountChange(passengers.length - 1)
                        }
                        disabled={passengers.length <= 1}
                        aria-label="Decrease passengers"
                        className="p-2 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
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
                        className="p-2 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-zinc-800">
                  {passengers.map((pax, idx) => (
                    <div
                      key={pax.id}
                      className="py-4 first:pt-0 last:pb-0 space-y-3"
                    >
                      <div className="text-xs font-semibold text-zinc-400">
                        Passenger {idx + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`pax-name-${pax.id}`}
                            className="block text-xs font-medium text-zinc-300 mb-1"
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
                            className="w-full px-3 py-2 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`pax-cit-${pax.id}`}
                            className="block text-xs font-medium text-zinc-300 mb-1"
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
                            className="w-full px-3 py-2 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`pax-pref-${pax.id}`}
                            className="block text-xs font-medium text-zinc-300 mb-1"
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
                            className="w-full px-3 py-2 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
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
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap"
                >
                  Proceed to Payment (Rs.{totalFare.toLocaleString('en-IN')})
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Summary Column */}
        <aside className="lg:col-span-4 bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="pb-4 border-b border-zinc-800">
            <h2 className="font-display text-base font-semibold text-white">
              Booking Summary
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {checkoutStep === 'payment'
                ? 'Awaiting payment authorization'
                : 'Live fare & flight schedule breakdown'}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-zinc-400">Route</dt>
              <dd className="font-mono font-semibold text-white">
                {(departureAirport || '---').toUpperCase()} →{' '}
                {(arrivalAirport || '---').toUpperCase()}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-zinc-400">Airline</dt>
              <dd className="font-medium text-zinc-100 text-right">
                {selectedAirline.name} ({selectedAirline.code})
              </dd>
            </div>
            {flightTimes && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">Departure</dt>
                  <dd className="font-mono text-xs text-zinc-200 tabular-nums">
                    {formatDisplayDateTime(flightTimes.departureDateTime)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">Arrival</dt>
                  <dd className="font-mono text-xs text-zinc-200 tabular-nums">
                    {formatDisplayDateTime(flightTimes.arrivalDateTime)}
                  </dd>
                </div>
              </>
            )}
          </dl>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <div className="text-xs font-medium text-zinc-400">
              Passengers ({passengers.length})
            </div>
            <ul className="space-y-1.5 text-xs">
              {passengers.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-zinc-200"
                >
                  <span className="truncate">
                    {idx + 1}. {p.name.trim() || 'Unnamed passenger'}
                  </span>
                  <span className="text-zinc-400 whitespace-nowrap shrink-0">
                    {p.preference}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Fare per passenger</span>
              <span className="font-mono tabular-nums text-zinc-200">
                Rs.{selectedAirline.fare.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-white">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums">
                Rs.{totalFare.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
