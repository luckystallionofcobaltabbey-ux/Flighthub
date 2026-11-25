import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid3X3,
  ListChecks,
  Menu,
  Plane,
  Play,
  PlusCircle,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { BookTicketView } from './components/BookTicketView';
import { CabinSeatMapView } from './components/CabinSeatMapView';
import { CancelTicketView } from './components/CancelTicketView';
import { DeveloperPortalView } from './components/DeveloperPortalView';
import { FlightFaresView } from './components/FlightFaresView';
import { GtaLoadingScreen } from './components/GtaLoadingScreen';
import { ViewTicketsView } from './components/ViewTicketsView';
import {
  Airline,
  AppEventRecord,
  AppEventType,
  BookingRecord,
  PassengerDraft,
  PaymentDetails,
  PaymentMethod,
  SeatRecord,
  WorkspaceTab,
} from './types/flighthub';
import {
  buildSampleBookings,
  cancelBookingTransaction,
  createBookingsTransaction,
  createInitialSeats,
} from './utils/flightEngine';

const STORAGE_BOOKINGS_KEY = 'flighthub_bookings_v1';
const STORAGE_SEATS_KEY = 'flighthub_seats_v1';
const STORAGE_EVENTS_KEY = 'flighthub_events_v1';
const MAX_STORED_EVENTS = 200;

function loadInitialBookings(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is BookingRecord =>
        Boolean(b) &&
        typeof b.bookingId === 'string' &&
        typeof b.passengerName === 'string' &&
        typeof b.departureDateTime === 'string' &&
        typeof b.arrivalDateTime === 'string' &&
        typeof b.fare === 'number'
    );
  } catch {
    return [];
  }
}

function loadInitialSeats(): SeatRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_SEATS_KEY);
    if (!raw) return createInitialSeats();
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 180 &&
      parsed.every(
        (s) => s && typeof s.seatNumber === 'string' && typeof s.row === 'number'
      )
    ) {
      return parsed;
    }
    return createInitialSeats();
  } catch {
    return createInitialSeats();
  }
}

function loadInitialEvents(): AppEventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is AppEventRecord =>
          Boolean(e) &&
          typeof e.id === 'string' &&
          typeof e.type === 'string' &&
          typeof e.timestamp === 'string' &&
          typeof e.summary === 'string'
      )
      .slice(0, MAX_STORED_EVENTS);
  } catch {
    return [];
  }
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof PlusCircle;
}> = [
  { id: 'book', label: 'New Ticket', icon: PlusCircle },
  { id: 'view', label: 'View Ticket', icon: Search },
  { id: 'cancel', label: 'Cancel Ticket', icon: Trash2 },
  { id: 'fares', label: 'View Fares', icon: ListChecks },
  { id: 'seats', label: 'Cabin Seat Map', icon: Grid3X3 },
  { id: 'developer', label: 'Developer Portal', icon: Terminal },
];

export default function App() {
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('book');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>(loadInitialBookings);
  const [seats, setSeats] = useState<SeatRecord[]>(loadInitialSeats);
  const [events, setEvents] = useState<AppEventRecord[]>(loadInitialEvents);

  const [preselectedAirlineCode, setPreselectedAirlineCode] = useState<
    string | null
  >(null);
  const [cancelTargetBookingId, setCancelTargetBookingId] = useState<
    string | null
  >(null);

  const bootedRef = useRef(false);

  const logEvent = useCallback(
    (
      type: AppEventType,
      summary: string,
      metadata?: Record<string, unknown>
    ) => {
      const nextEvent: AppEventRecord = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        timestamp: new Date().toISOString(),
        summary,
        metadata,
      };
      setEvents((prev) => [nextEvent, ...prev].slice(0, MAX_STORED_EVENTS));
    },
    []
  );

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    logEvent('SESSION_BOOT', 'FlightHub Lmtd client workspace initialized', {
      activeBookings: bookings.length,
      openSeats: seats.filter((s) => !s.isBooked).length,
    });
  }, [bookings, seats, logEvent]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
      localStorage.setItem(STORAGE_SEATS_KEY, JSON.stringify(seats));
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    } catch {
      // Storage quota or privacy mode fallback
    }
  }, [bookings, seats, events]);

  const openSeatsCount = useMemo(
    () => seats.filter((s) => !s.isBooked).length,
    [seats]
  );

  const handleLoaderComplete = useCallback(() => {
    setShowIntroLoader(false);
  }, []);

  const handlePaymentAttempt = useCallback(
    (attempt: {
      status: 'authorized' | 'declined';
      method: PaymentMethod;
      amount: number;
      orderId: string;
      referenceId?: string;
    }) => {
      if (attempt.status === 'authorized') {
        logEvent(
          'PAYMENT_AUTHORIZED',
          `Razorpay ${attempt.method} payment authorized (Rs.${attempt.amount.toLocaleString('en-IN')})`,
          attempt
        );
      } else {
        logEvent(
          'PAYMENT_DECLINED',
          `Razorpay ${attempt.method} payment declined (Rs.${attempt.amount.toLocaleString('en-IN')})`,
          attempt
        );
      }
    },
    [logEvent]
  );

  const handleConfirmBooking = (params: {
    airline: Airline;
    departureAirport: string;
    arrivalAirport: string;
    travelDate: string;
    departureTime: string;
    passengers: PassengerDraft[];
    payment: PaymentDetails;
  }): BookingRecord[] => {
    const result = createBookingsTransaction({
      seats,
      existingBookings: bookings,
      ...params,
    });
    setSeats(result.updatedSeats);
    setBookings(result.updatedBookings);
    setPreselectedAirlineCode(null);

    const totalPaid = result.createdBookings.reduce((sum, b) => sum + b.fare, 0);
    logEvent(
      'BOOKING_CREATED',
      `${result.createdBookings.length} ${result.createdBookings.length === 1 ? 'ticket' : 'tickets'} issued on ${params.airline.name} (${params.departureAirport} → ${params.arrivalAirport})`,
      {
        bookingIds: result.createdBookings.map((b) => b.bookingId),
        seatsAssigned: result.createdBookings.map((b) => b.seatBooked),
        airlineCode: params.airline.code,
        route: `${params.departureAirport} -> ${params.arrivalAirport}`,
        totalFare: totalPaid,
        paymentMethod: params.payment.method,
        paymentOrderId: params.payment.orderId,
      }
    );

    return result.createdBookings;
  };

  const handleConfirmCancel = (bookingId: string): BookingRecord => {
    const result = cancelBookingTransaction(bookings, seats, bookingId);
    setSeats(result.updatedSeats);
    setBookings(result.updatedBookings);
    setCancelTargetBookingId(null);

    logEvent(
      'TICKET_CANCELLED',
      `Cancelled ${result.cancelledBooking.bookingId} (${result.cancelledBooking.passengerName}, Seat ${result.cancelledBooking.seatBooked} released)`,
      {
        bookingId: result.cancelledBooking.bookingId,
        seatReleased: result.cancelledBooking.seatBooked,
        airlineCode: result.cancelledBooking.airlineCode,
        refundAmount: result.cancelledBooking.fare,
      }
    );

    return result.cancelledBooking;
  };

  const handleRequestCancelFromView = (bookingId: string) => {
    setCancelTargetBookingId(bookingId);
    setActiveTab('cancel');
  };

  const handleSearchLogged = useCallback(
    (info: {
      mode: 'bookingId' | 'passengerName';
      term: string;
      matchCount: number;
    }) => {
      logEvent(
        'TICKET_SEARCHED',
        `Lookup by ${info.mode} "${info.term}" (${info.matchCount} matched)`,
        info
      );
    },
    [logEvent]
  );

  const handleSelectAirlineFromFares = (airline: Airline) => {
    setPreselectedAirlineCode(airline.code);
    setActiveTab('book');
  };

  const handleLoadSampleData = () => {
    const existingIds = new Set(bookings.map((b) => b.bookingId));
    const result = buildSampleBookings(seats, bookings);
    const addedBookings = result.updatedBookings.filter(
      (b) => !existingIds.has(b.bookingId)
    );
    setSeats(result.updatedSeats);
    setBookings(result.updatedBookings);
    logEvent(
      'SAMPLE_DATA_LOADED',
      `Seeded ${addedBookings.length} sample reservations into active cabin`,
      {
        bookingIds: addedBookings.map((b) => b.bookingId),
      }
    );
  };

  const handleResetAll = () => {
    const clearedCount = bookings.length;
    setBookings([]);
    setSeats(createInitialSeats());
    setCancelTargetBookingId(null);
    logEvent(
      'CABIN_RESET',
      `Cleared ${clearedCount} active reservations and reset all 180 seats`,
      { clearedCount }
    );
  };

  const activeNavMeta =
    NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const handleSelectTab = (tab: WorkspaceTab) => {
    if (tab !== 'cancel') {
      setCancelTargetBookingId(null);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-zinc-100 flex">
      {showIntroLoader && <GtaLoadingScreen onComplete={handleLoaderComplete} />}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B0B0D] border-r border-zinc-800">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-zinc-800">
          <Plane className="w-5 h-5 text-[#E50914] shrink-0" />
          <span
            style={{ fontFamily: 'var(--font-brand)' }}
            className="text-2xl tracking-wider text-white whitespace-nowrap leading-none pt-0.5"
          >
            FLIGHTHUB <span className="text-[#E50914]">LMTD</span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Workspace">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#E50914]/15 text-white border border-[#E50914]/40'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#E50914]' : ''
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'view' && bookings.length > 0 && (
                  <span className="font-mono text-xs text-zinc-400 tabular-nums">
                    {bookings.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Cabin Open</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {openSeatsCount} / 180
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Active Bookings</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {bookings.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIntroLoader(true)}
            className="w-full py-1.5 px-3 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-[#141414] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3 h-3 text-[#E50914]" />
            <span>Replay Intro</span>
          </button>

          {bookings.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full py-1.5 px-3 text-xs font-medium text-zinc-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/70 hover:bg-red-950/30 rounded-lg transition-colors whitespace-nowrap"
            >
              Reset All Reservations
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-[#0B0B0D] h-full border-r border-zinc-800 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#E50914]" />
                <span
                  style={{ fontFamily: 'var(--font-brand)' }}
                  className="text-xl tracking-wider text-white pt-0.5"
                >
                  FLIGHTHUB <span className="text-[#E50914]">LMTD</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#E50914]/15 text-white border border-[#E50914]/40'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#E50914]' : ''
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'view' && bookings.length > 0 && (
                      <span className="font-mono text-xs text-zinc-400 tabular-nums">
                        {bookings.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-medium text-zinc-400 whitespace-nowrap">
                FlightHub Lmtd
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-white truncate">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectTab('book')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              New Ticket
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
          {activeTab === 'book' && (
            <BookTicketView
              key={preselectedAirlineCode ?? 'default'}
              seats={seats}
              preselectedAirlineCode={preselectedAirlineCode}
              onConfirmBooking={handleConfirmBooking}
              onPaymentAttempt={handlePaymentAttempt}
              onNavigateToView={() => handleSelectTab('view')}
              onNavigateToSeats={() => handleSelectTab('seats')}
            />
          )}

          {activeTab === 'view' && (
            <ViewTicketsView
              bookings={bookings}
              onRequestCancel={handleRequestCancelFromView}
              onGoToBook={() => handleSelectTab('book')}
              onLoadSampleData={handleLoadSampleData}
              onSearchLogged={handleSearchLogged}
            />
          )}

          {activeTab === 'cancel' && (
            <CancelTicketView
              bookings={bookings}
              initialBookingId={cancelTargetBookingId}
              onConfirmCancel={handleConfirmCancel}
              onGoToSeats={() => handleSelectTab('seats')}
            />
          )}

          {activeTab === 'fares' && (
            <FlightFaresView
              onSelectAirlineForBooking={handleSelectAirlineFromFares}
            />
          )}

          {activeTab === 'seats' && (
            <CabinSeatMapView
              seats={seats}
              bookings={bookings}
              onRequestCancel={handleRequestCancelFromView}
            />
          )}

          {activeTab === 'developer' && (
            <DeveloperPortalView
              bookings={bookings}
              seats={seats}
              events={events}
              onLoadSampleData={handleLoadSampleData}
              onClearEvents={() => setEvents([])}
            />
          )}
        </main>
      </div>
    </div>
  );
}
