import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  Cloud,
  CloudOff,
  Grid3X3,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Play,
  PlusCircle,
  Search,
  Terminal,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BookTicketView } from './components/BookTicketView';
import { CabinSeatMapView } from './components/CabinSeatMapView';
import { CancelTicketView } from './components/CancelTicketView';
import { DeveloperPortalView } from './components/DeveloperPortalView';
import { FlightFaresView } from './components/FlightFaresView';
import { GtaLoadingScreen } from './components/GtaLoadingScreen';
import { IsometricBlaugranaCube } from './components/IsometricMotif';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ViewTicketsView } from './components/ViewTicketsView';
import { auth, googleProvider } from './firebase';
import {
  clearAllBookingsInCloud,
  clearEventsInCloud,
  deleteBookingFromCloud,
  deriveSeatsWithSharedState,
  ensureUserWorkspace,
  isDeveloperAccount,
  migrateLegacyUserBookings,
  subscribeCloudBookings,
  subscribeCloudEvents,
  subscribeSharedCabinSeats,
  writeBookingsBatchToCloud,
  writeEventToCloud,
} from './services/firestoreSync';
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
import {
  loadEncryptedLocalJson,
  saveEncryptedLocalJson,
} from './utils/cryptoVault';
import {
  isSoundEnabled,
  playBookingConfirmedSound,
  playPaymentAuthorizedSound,
  playPaymentDeclinedSound,
  playTicketCancelledSound,
  primeAudioContext,
  setSoundEnabledPref,
} from './utils/soundEffects';

const STORAGE_BOOKINGS_KEY = 'flighthub_bookings_v1';
const STORAGE_SEATS_KEY = 'flighthub_seats_v1';
const STORAGE_EVENTS_KEY = 'flighthub_events_v1';
const MAX_STORED_EVENTS = 200;

function sanitizeBookingArray(parsed: unknown): BookingRecord[] {
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
}

function sanitizeEventArray(parsed: unknown): AppEventRecord[] {
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

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [seats, setSeats] = useState<SeatRecord[]>(loadInitialSeats);
  const [events, setEvents] = useState<AppEventRecord[]>([]);
  const [localHydrated, setLocalHydrated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(isSoundEnabled);

  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const [preselectedAirlineCode, setPreselectedAirlineCode] = useState<
    string | null
  >(null);
  const [cancelTargetBookingId, setCancelTargetBookingId] = useState<
    string | null
  >(null);

  const bootedRef = useRef(false);
  const localBookingsRef = useRef<BookingRecord[]>(bookings);
  const localEventsRef = useRef<AppEventRecord[]>(events);
  const sharedOccupiedRef = useRef<string[]>([]);
  const migratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [rawBookings, rawEvents] = await Promise.all([
        loadEncryptedLocalJson<unknown>(STORAGE_BOOKINGS_KEY),
        loadEncryptedLocalJson<unknown>(STORAGE_EVENTS_KEY),
      ]);
      if (!active) return;
      if (!auth.currentUser) {
        const cleanBookings = sanitizeBookingArray(rawBookings);
        const cleanEvents = sanitizeEventArray(rawEvents);
        if (cleanBookings.length > 0) {
          localBookingsRef.current = cleanBookings;
          setBookings(cleanBookings);
        }
        if (cleanEvents.length > 0) {
          localEventsRef.current = cleanEvents;
          setEvents((prev) =>
            prev.length > 0 ? [...prev, ...cleanEvents].slice(0, MAX_STORED_EVENTS) : cleanEvents
          );
        }
      }
      setLocalHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localBookingsRef.current = bookings;
  }, [bookings]);

  useEffect(() => {
    localEventsRef.current = events;
  }, [events]);

  const logEvent = useCallback(
    (
      type: AppEventType,
      summary: string,
      metadata?: Record<string, unknown>
    ) => {
      const nextEvent: AppEventRecord = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        actorEmail: auth.currentUser?.email ?? undefined,
        actorRole: auth.currentUser
          ? isDeveloperAccount(auth.currentUser)
            ? 'developer'
            : 'tester'
          : undefined,
        type,
        timestamp: new Date().toISOString(),
        summary,
        metadata,
      };
      setEvents((prev) => [nextEvent, ...prev].slice(0, MAX_STORED_EVENTS));
      if (auth.currentUser) {
        void writeEventToCloud(auth.currentUser, nextEvent).catch(() => {
          // Non-fatal telemetry write fallback
        });
      }
    },
    []
  );

  useEffect(() => {
    let unsubBookings: (() => void) | null = null;
    let unsubEvents: (() => void) | null = null;
    let unsubCabin: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubBookings) {
        unsubBookings();
        unsubBookings = null;
      }
      if (unsubEvents) {
        unsubEvents();
        unsubEvents = null;
      }
      if (unsubCabin) {
        unsubCabin();
        unsubCabin = null;
      }

      setCloudUser(user);
      setAuthReady(true);
      setSyncError(null);

      if (!user) {
        migratedUidRef.current = null;
        sharedOccupiedRef.current = [];
        return;
      }

      try {
        await ensureUserWorkspace(user);
        try {
          await migrateLegacyUserBookings(user);
        } catch {
          // Legacy migration is best-effort and must not block live sync listeners
        }

        unsubCabin = subscribeSharedCabinSeats(
          (occupiedSeats) => {
            sharedOccupiedRef.current = occupiedSeats;
            setSeats(
              deriveSeatsWithSharedState(localBookingsRef.current, occupiedSeats)
            );
          },
          (err) => {
            setSyncError(
              err instanceof Error ? err.message : 'Shared cabin sync error'
            );
          }
        );

        unsubBookings = subscribeCloudBookings(
          user,
          (cloudBookings) => {
            if (migratedUidRef.current !== user.uid) {
              migratedUidRef.current = user.uid;
              const cloudIds = new Set(cloudBookings.map((b) => b.bookingId));
              const occupiedSet = new Set([
                ...sharedOccupiedRef.current,
                ...cloudBookings.map((b) => b.seatBooked),
              ]);
              const localOnly = localBookingsRef.current.filter(
                (b) =>
                  !cloudIds.has(b.bookingId) && !occupiedSet.has(b.seatBooked)
              );
              if (localOnly.length > 0) {
                void writeBookingsBatchToCloud(user, localOnly).catch((err) => {
                  setSyncError(
                    err instanceof Error
                      ? err.message
                      : 'Failed to upload local bookings to Firebase.'
                  );
                });
              }
            }
            setBookings(cloudBookings);
            setSeats(
              deriveSeatsWithSharedState(
                cloudBookings,
                sharedOccupiedRef.current
              )
            );
          },
          (err) => {
            setSyncError(
              err instanceof Error ? err.message : 'Cloud sync error'
            );
          }
        );

        unsubEvents = subscribeCloudEvents(
          user,
          (cloudEvents) => {
            setEvents(cloudEvents);
          },
          (err) => {
            setSyncError(
              err instanceof Error ? err.message : 'Telemetry sync error'
            );
          }
        );
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Cloud setup failed');
      }
    });

    return () => {
      unsubAuth();
      if (unsubBookings) unsubBookings();
      if (unsubEvents) unsubEvents();
      if (unsubCabin) unsubCabin();
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      primeAudioContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!localHydrated || bootedRef.current) return;
    bootedRef.current = true;
    logEvent('SESSION_BOOT', 'FlightHub Lmtd client workspace initialized', {
      activeBookings: bookings.length,
      openSeats: seats.filter((s) => !s.isBooked).length,
    });
  }, [localHydrated, bookings, seats, logEvent]);

  useEffect(() => {
    if (!localHydrated) return;
    void saveEncryptedLocalJson(STORAGE_BOOKINGS_KEY, bookings);
    void saveEncryptedLocalJson(STORAGE_EVENTS_KEY, events);
    try {
      localStorage.setItem(STORAGE_SEATS_KEY, JSON.stringify(seats));
    } catch {
      // Storage quota or privacy mode fallback
    }
  }, [localHydrated, bookings, seats, events]);

  const openSeatsCount = useMemo(
    () => seats.filter((s) => !s.isBooked).length,
    [seats]
  );

  const handleLoaderComplete = useCallback(() => {
    setShowIntroLoader(false);
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setSoundEnabledPref(next);
      if (next) {
        playPaymentAuthorizedSound();
      }
      return next;
    });
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
        playPaymentAuthorizedSound();
        logEvent(
          'PAYMENT_AUTHORIZED',
          `Razorpay ${attempt.method} payment authorized (Rs.${attempt.amount.toLocaleString('en-IN')})`,
          attempt
        );
      } else {
        playPaymentDeclinedSound();
        logEvent(
          'PAYMENT_DECLINED',
          `Razorpay ${attempt.method} payment declined (Rs.${attempt.amount.toLocaleString('en-IN')})`,
          attempt
        );
      }
    },
    [logEvent]
  );

  const handleSignInCloud = useCallback(async (): Promise<boolean> => {
    setSyncBusy(true);
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const isIOSStandalone =
        typeof window !== 'undefined' &&
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true;
      if (
        isIOSStandalone &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment')
      ) {
        setSyncError(
          'iOS Home Screen blocked the Google popup. Allow popups in Safari settings or sign in via Safari tab first.'
        );
      } else {
        setSyncError(
          err instanceof Error ? err.message : 'Google sign-in cancelled'
        );
      }
      return false;
    } finally {
      setSyncBusy(false);
    }
  }, []);

  const handleSignOutCloud = useCallback(async () => {
    setSyncBusy(true);
    try {
      await signOut(auth);
    } finally {
      setSyncBusy(false);
    }
  }, []);

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
    playBookingConfirmedSound();

    const activeCloudUser = auth.currentUser ?? cloudUser;
    if (activeCloudUser) {
      void writeBookingsBatchToCloud(
        activeCloudUser,
        result.createdBookings
      ).catch((err) => {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Failed to sync booking to Firebase.'
        );
      });
    }

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
    playTicketCancelledSound();

    const activeCloudUser = auth.currentUser ?? cloudUser;
    if (activeCloudUser) {
      void deleteBookingFromCloud(
        activeCloudUser,
        result.cancelledBooking
      ).catch((err) => {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Failed to remove booking from Firebase.'
        );
      });
    }

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
    const activeCloudUser = auth.currentUser ?? cloudUser;
    if (activeCloudUser && addedBookings.length > 0) {
      void writeBookingsBatchToCloud(activeCloudUser, addedBookings).catch(
        (err) => {
          setSyncError(
            err instanceof Error
              ? err.message
              : 'Failed to sync sample bookings to Firebase.'
          );
        }
      );
    }
    logEvent(
      'SAMPLE_DATA_LOADED',
      `Seeded ${addedBookings.length} sample reservations into active cabin`,
      {
        bookingIds: addedBookings.map((b) => b.bookingId),
      }
    );
  };

  const handleResetAll = () => {
    const snapshot = [...bookings];
    const clearedCount = snapshot.length;
    setBookings([]);
    setSeats(createInitialSeats());
    setCancelTargetBookingId(null);
    playTicketCancelledSound();
    const activeCloudUser = auth.currentUser ?? cloudUser;
    if (activeCloudUser && snapshot.length > 0) {
      void clearAllBookingsInCloud(activeCloudUser, snapshot).catch((err) => {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Failed to clear bookings in Firebase.'
        );
      });
    }
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
    <div className="min-h-screen bg-[#070B14] bg-isometric-grid text-slate-100 flex">
      {showIntroLoader && <GtaLoadingScreen onComplete={handleLoaderComplete} />}
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#090F1D] border-r border-[#1E2E4E]">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-[#1E2E4E]">
          <IsometricBlaugranaCube className="w-7 h-7 shrink-0" />
          <span
            style={{ fontFamily: 'var(--font-brand)' }}
            className="text-2xl tracking-wider text-white whitespace-nowrap leading-none pt-0.5"
          >
            FLIGHTHUB <span className="text-[#EDBB00]">LMTD</span>
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
                    ? 'bg-gradient-to-r from-[#004D98]/45 to-[#A50044]/35 text-white border border-[#1C6DD0]/70'
                    : 'text-slate-400 hover:text-white hover:bg-[#121D33] border border-transparent'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#EDBB00]' : ''
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'view' && bookings.length > 0 && (
                  <span className="font-mono text-xs text-slate-300 tabular-nums">
                    {bookings.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1E2E4E] space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Cabin Open</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {openSeatsCount} / 180
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Bookings</span>
              <span className="font-mono font-semibold text-[#EDBB00] tabular-nums">
                {bookings.length}
              </span>
            </div>
          </div>

          {authReady &&
            (cloudUser ? (
              <div className="p-2.5 rounded-lg bg-[#0D1526] border border-[#1E2E4E] space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium truncate">
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {cloudUser.email ?? cloudUser.displayName ?? 'Cloud Sync'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSignOutCloud()}
                    disabled={syncBusy}
                    title="Sign out from cloud sync"
                    className="p-1 text-slate-400 hover:text-white rounded shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignInCloud()}
                disabled={syncBusy}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#0D1526] hover:bg-[#121D33] border border-[#1C6DD0]/70 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
                <span>{syncBusy ? 'Connecting...' : 'Sign In to Cloud Sync'}</span>
              </button>
            ))}

          {syncError && (
            <p className="text-[11px] text-[#FF4D88] leading-snug">
              {syncError}
            </p>
          )}

          <PWAInstallButton variant="sidebar" />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowIntroLoader(true)}
              className="py-1.5 px-2.5 text-xs font-medium text-slate-300 hover:text-white border border-[#1E2E4E] hover:border-[#1C6DD0] bg-[#0D1526] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3 h-3 text-[#EDBB00] shrink-0" />
              <span>Replay Intro</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Mute UI audio cues' : 'Enable UI audio cues'}
              className="py-1.5 px-2.5 text-xs font-medium text-slate-300 hover:text-white border border-[#1E2E4E] hover:border-[#1C6DD0] bg-[#0D1526] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                  <span>Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>

          {bookings.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full py-1.5 px-3 text-xs font-medium text-slate-400 hover:text-[#FF4D88] border border-[#1E2E4E] hover:border-[#A50044] hover:bg-[#A50044]/15 rounded-lg transition-colors whitespace-nowrap"
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
          <aside className="relative w-64 max-w-full bg-[#090F1D] h-full border-r border-[#1E2E4E] flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#1E2E4E]">
              <div className="flex items-center gap-2">
                <IsometricBlaugranaCube className="w-6 h-6" />
                <span
                  style={{ fontFamily: 'var(--font-brand)' }}
                  className="text-xl tracking-wider text-white pt-0.5"
                >
                  FLIGHTHUB <span className="text-[#EDBB00]">LMTD</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
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
                        ? 'bg-gradient-to-r from-[#004D98]/45 to-[#A50044]/35 text-white border border-[#1C6DD0]/70'
                        : 'text-slate-400 hover:text-white hover:bg-[#121D33] border border-transparent'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#EDBB00]' : ''
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'view' && bookings.length > 0 && (
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {bookings.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#1E2E4E] space-y-2.5">
              {authReady &&
                (cloudUser ? (
                  <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E2E4E] flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium truncate">
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {cloudUser.email ?? 'Cloud Synced'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleSignOutCloud()}
                      className="p-1 text-slate-400 hover:text-white shrink-0"
                      title="Sign out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSignInCloud()}
                    disabled={syncBusy}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#0D1526] hover:bg-[#121D33] border border-[#1C6DD0]/70 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
                    <span>Sign In to Cloud Sync</span>
                  </button>
                ))}
              <PWAInstallButton variant="sidebar" />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowIntroLoader(true);
                  }}
                  className="py-1.5 px-2.5 text-xs font-medium text-slate-300 hover:text-white border border-[#1E2E4E] hover:border-[#1C6DD0] bg-[#0D1526] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Play className="w-3 h-3 text-[#EDBB00] shrink-0" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  aria-pressed={soundEnabled}
                  className="py-1.5 px-2.5 text-xs font-medium text-slate-300 hover:text-white border border-[#1E2E4E] hover:border-[#1C6DD0] bg-[#0D1526] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                      <span>Audio On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="min-h-16 pt-[env(safe-area-inset-top)] bg-[#090F1D]/95 backdrop-blur-md border-b border-[#1E2E4E] px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-medium text-slate-400 whitespace-nowrap">
                FlightHub Lmtd
              </span>
              <span className="text-slate-600" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-white truncate">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {authReady && !cloudUser && (
              <button
                type="button"
                onClick={() => void handleSignInCloud()}
                disabled={syncBusy}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-white bg-[#0D1526] hover:bg-[#121D33] border border-[#1C6DD0]/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Sign in with Google so bookings sync to Firebase"
              >
                <CloudOff className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
                <span>{syncBusy ? '...' : 'Sign In'}</span>
              </button>
            )}
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={() => handleSelectTab('book')}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              New Ticket
            </button>
          </div>
        </header>

        {/* Cross-Device Cloud Sync Status Strip */}
        {authReady && (
          <div className="bg-[#090F1D]/80 border-b border-[#1E2E4E] px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {cloudUser ? (
              <div className="flex flex-wrap items-center gap-2 text-emerald-400">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">
                  {isDeveloperAccount(cloudUser)
                    ? `Cloud Live · Developer (${cloudUser.email})`
                    : `Cloud Synced · Beta Tester (${cloudUser.email})`}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-amber-300">
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Local device mode only — tap{' '}
                  <button
                    type="button"
                    onClick={() => void handleSignInCloud()}
                    className="underline font-semibold text-white hover:text-[#EDBB00]"
                  >
                    Sign In with Google
                  </button>{' '}
                  so purchases sync to Firebase.
                </span>
              </div>
            )}

            {syncError && (
              <span className="text-[#FF4D88] font-medium">
                Sync Error: {syncError}
              </span>
            )}
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
          {activeTab === 'book' && (
            <BookTicketView
              key={preselectedAirlineCode ?? 'default'}
              seats={seats}
              preselectedAirlineCode={preselectedAirlineCode}
              authReady={authReady}
              isCloudSignedIn={Boolean(cloudUser)}
              syncBusy={syncBusy}
              onSignInCloud={handleSignInCloud}
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
              devUnlocked={Boolean(devToken)}
              userEmail={cloudUser?.email ?? null}
              isDeveloperEmail={isDeveloperAccount(cloudUser)}
              onUnlockDevPortal={(token) => setDevToken(token)}
              onLockDevPortal={() => setDevToken(null)}
              onSignInCloud={() => void handleSignInCloud()}
              onLoadSampleData={handleLoadSampleData}
              onClearEvents={() => {
                const ids = localEventsRef.current.map((e) => e.id);
                setEvents([]);
                if (cloudUser && ids.length > 0) {
                  void clearEventsInCloud(ids);
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
