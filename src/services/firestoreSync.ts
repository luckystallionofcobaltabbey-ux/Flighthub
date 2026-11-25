import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AppEventRecord,
  BookingRecord,
  DEVELOPER_ADMIN_EMAIL,
  FareBreakdown,
  PaymentDetails,
  SeatRecord,
} from '../types/flighthub';
import { createInitialSeats } from '../utils/flightEngine';
import { OperationType, db, handleFirestoreError } from '../firebase';

export function isDeveloperAccount(user: User | null): boolean {
  if (!user?.email) return false;
  return (
    user.email.trim().toLowerCase() === DEVELOPER_ADMIN_EMAIL.toLowerCase() &&
    user.emailVerified
  );
}

function clampStr(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function sanitizeFareBreakdown(fb: FareBreakdown): FareBreakdown {
  return {
    baseFare: Number(fb.baseFare) || 0,
    distanceCharge: Number(fb.distanceCharge) || 0,
    fuelSurcharge: Number(fb.fuelSurcharge) || 0,
    airportTaxes: Number(fb.airportTaxes) || 0,
    windFuelMultiplier: Number(fb.windFuelMultiplier) || 1,
    totalFare: Math.max(1, Number(fb.totalFare) || 1),
    estimatedFuelLitres: Number(fb.estimatedFuelLitres) || 0,
    distanceKm: Number(fb.distanceKm) || 0,
    isInternational: Boolean(fb.isInternational),
  };
}

function sanitizePayment(p: PaymentDetails): PaymentDetails {
  return {
    gateway: 'Razorpay',
    method: p.method,
    referenceId: clampStr(p.referenceId, 64) || 'pay_sync',
    orderId: clampStr(p.orderId, 64) || 'order_sync',
    accountMasked: clampStr(p.accountMasked, 80),
    contact: clampStr(p.contact, 40),
    email: clampStr(p.email, 254),
    status: 'Paid',
    paidAt: clampStr(p.paidAt, 40) || new Date().toISOString(),
  };
}

function buildBookingFirestoreDoc(user: User, b: BookingRecord) {
  const actorRole = isDeveloperAccount(user) ? 'developer' : 'tester';
  const payload: Record<string, unknown> = {
    ownerId: user.uid,
    actorEmail: clampStr(user.email ?? '', 254).toLowerCase(),
    actorRole,
    bookingId: clampStr(b.bookingId, 64),
    passengerName: clampStr(b.passengerName, 120) || 'Passenger',
    citizenship: clampStr(b.citizenship, 80) || 'Unknown',
    seatPreference: b.seatPreference,
    seatBooked: clampStr(b.seatBooked, 6),
    preferenceStatus: clampStr(b.preferenceStatus, 80),
    airline: clampStr(b.airline, 100),
    airlineCode: clampStr(b.airlineCode, 8).toUpperCase(),
    departureDateTime: clampStr(b.departureDateTime, 32),
    departureAirport: clampStr(b.departureAirport, 3).toUpperCase(),
    arrivalDateTime: clampStr(b.arrivalDateTime, 32),
    arrivalAirport: clampStr(b.arrivalAirport, 3).toUpperCase(),
    fare: Math.max(1, Math.min(5_000_000, Number(b.fare) || 1)),
    createdAt: clampStr(b.createdAt, 40) || new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
  };

  if (b.departureTzLabel) {
    payload.departureTzLabel = clampStr(b.departureTzLabel, 32);
  }
  if (b.arrivalTzLabel) {
    payload.arrivalTzLabel = clampStr(b.arrivalTzLabel, 32);
  }
  if (typeof b.durationMinutes === 'number' && b.durationMinutes > 0) {
    payload.durationMinutes = Math.min(3000, Math.round(b.durationMinutes));
  }
  if (typeof b.distanceKm === 'number' && b.distanceKm >= 0) {
    payload.distanceKm = Math.min(25000, Math.round(b.distanceKm));
  }
  if (b.fareBreakdown) {
    payload.fareBreakdown = sanitizeFareBreakdown(b.fareBreakdown);
  }
  if (b.payment) {
    payload.payment = sanitizePayment(b.payment);
  }

  return payload;
}

function sanitizeEventMetadata(
  meta: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  const entries = Object.entries(meta).slice(0, 15);
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null
    ) {
      cleaned[k] = typeof v === 'string' ? v.slice(0, 160) : v;
    } else if (Array.isArray(v)) {
      cleaned[k] = v.slice(0, 20).map((item) =>
        typeof item === 'string' ? item.slice(0, 64) : item
      );
    }
  }
  return cleaned;
}

export function deriveSeatsWithSharedState(
  visibleBookings: BookingRecord[],
  sharedOccupiedSeats: string[]
): SeatRecord[] {
  const seats = createInitialSeats();
  const ownSeatToBooking = new Map<string, string>();
  for (const b of visibleBookings) {
    if (b.seatBooked && !ownSeatToBooking.has(b.seatBooked)) {
      ownSeatToBooking.set(b.seatBooked, b.bookingId);
    }
  }
  const sharedSet = new Set(sharedOccupiedSeats);

  return seats.map((s) => {
    const ownBookingId = ownSeatToBooking.get(s.seatNumber) ?? null;
    const isSharedOccupied = sharedSet.has(s.seatNumber);
    return {
      ...s,
      isBooked: ownBookingId !== null || isSharedOccupied,
      bookingId: ownBookingId ?? (isSharedOccupied ? 'TESTER-HOLD' : null),
    };
  });
}

const ensuredWorkspaceUids = new Set<string>();

export async function ensureUserWorkspace(user: User): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const workspaceRef = doc(db, 'users', uid);

  try {
    const existingSnap = await getDoc(workspaceRef);
    if (!existingSnap.exists()) {
      await setDoc(workspaceRef, {
        ownerId: uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(workspaceRef, {
        updatedAt: serverTimestamp(),
      });
    }
    ensuredWorkspaceUids.add(uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const profilePath = `users/${uid}/private/profile`;
  const profileRef = doc(db, 'users', uid, 'private', 'profile');
  try {
    const profileSnap = await getDoc(profileRef);
    const profileData = {
      ownerId: uid,
      email: clampStr(user.email ?? '', 254).toLowerCase(),
      displayName: clampStr(user.displayName ?? 'FlightHub User', 120),
      updatedAt: serverTimestamp(),
    };
    if (!profileSnap.exists()) {
      await setDoc(profileRef, profileData);
    } else {
      await updateDoc(profileRef, {
        email: profileData.email,
        displayName: profileData.displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

export async function migrateLegacyUserBookings(user: User): Promise<void> {
  const legacyPath = `users/${user.uid}/bookings`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'bookings'),
      where('ownerId', '==', user.uid)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const legacyBookings: BookingRecord[] = snap.docs.map((d) => {
      const raw = d.data() as Record<string, unknown>;
      return {
        bookingId: String(raw.bookingId ?? d.id),
        passengerName: String(raw.passengerName ?? ''),
        citizenship: String(raw.citizenship ?? ''),
        seatPreference: raw.seatPreference as BookingRecord['seatPreference'],
        seatBooked: String(raw.seatBooked ?? ''),
        preferenceStatus:
          raw.preferenceStatus as BookingRecord['preferenceStatus'],
        airline: String(raw.airline ?? ''),
        airlineCode: String(raw.airlineCode ?? ''),
        departureDateTime: String(raw.departureDateTime ?? ''),
        departureAirport: String(raw.departureAirport ?? ''),
        departureTzLabel: raw.departureTzLabel
          ? String(raw.departureTzLabel)
          : undefined,
        arrivalDateTime: String(raw.arrivalDateTime ?? ''),
        arrivalAirport: String(raw.arrivalAirport ?? ''),
        arrivalTzLabel: raw.arrivalTzLabel
          ? String(raw.arrivalTzLabel)
          : undefined,
        durationMinutes:
          typeof raw.durationMinutes === 'number'
            ? raw.durationMinutes
            : undefined,
        distanceKm:
          typeof raw.distanceKm === 'number' ? raw.distanceKm : undefined,
        fare: Number(raw.fare ?? 0),
        fareBreakdown: raw.fareBreakdown as FareBreakdown | undefined,
        payment: raw.payment as PaymentDetails | undefined,
        createdAt: String(raw.createdAt ?? ''),
      };
    });

    await writeBookingsBatchToCloud(user, legacyBookings);

    const delBatch = writeBatch(db);
    snap.docs.forEach((d) => delBatch.delete(d.ref));
    await delBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, legacyPath);
  }
}

export function subscribeSharedCabinSeats(
  onSeats: (occupiedSeats: string[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const cabinPath = 'cabin_state/shared';
  const ref = doc(db, 'cabin_state', 'shared');

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onSeats([]);
        return;
      }
      const raw = snap.data() as { occupiedSeats?: unknown };
      if (Array.isArray(raw.occupiedSeats)) {
        const clean = raw.occupiedSeats
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 180);
        onSeats(clean);
      } else {
        onSeats([]);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, cabinPath);
    }
  );
}

export function subscribeCloudBookings(
  user: User,
  onData: (bookings: BookingRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const bookingsPath = 'bookings';
  const isAdminUser = isDeveloperAccount(user);
  const q = isAdminUser
    ? collection(db, 'bookings')
    : query(collection(db, 'bookings'), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: BookingRecord[] = snapshot.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          bookingId: String(raw.bookingId ?? d.id),
          actorEmail: raw.actorEmail ? String(raw.actorEmail) : undefined,
          actorRole:
            raw.actorRole === 'developer' || raw.actorRole === 'tester'
              ? raw.actorRole
              : undefined,
          passengerName: String(raw.passengerName ?? ''),
          citizenship: String(raw.citizenship ?? ''),
          seatPreference: raw.seatPreference as BookingRecord['seatPreference'],
          seatBooked: String(raw.seatBooked ?? ''),
          preferenceStatus:
            raw.preferenceStatus as BookingRecord['preferenceStatus'],
          airline: String(raw.airline ?? ''),
          airlineCode: String(raw.airlineCode ?? ''),
          departureDateTime: String(raw.departureDateTime ?? ''),
          departureAirport: String(raw.departureAirport ?? ''),
          departureTzLabel: raw.departureTzLabel
            ? String(raw.departureTzLabel)
            : undefined,
          arrivalDateTime: String(raw.arrivalDateTime ?? ''),
          arrivalAirport: String(raw.arrivalAirport ?? ''),
          arrivalTzLabel: raw.arrivalTzLabel
            ? String(raw.arrivalTzLabel)
            : undefined,
          durationMinutes:
            typeof raw.durationMinutes === 'number'
              ? raw.durationMinutes
              : undefined,
          distanceKm:
            typeof raw.distanceKm === 'number' ? raw.distanceKm : undefined,
          fare: Number(raw.fare ?? 0),
          fareBreakdown: raw.fareBreakdown as FareBreakdown | undefined,
          payment: raw.payment as PaymentDetails | undefined,
          createdAt: String(raw.createdAt ?? ''),
        };
      });

      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, bookingsPath);
    }
  );
}

export function subscribeCloudEvents(
  user: User,
  onData: (events: AppEventRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const eventsPath = 'events';
  const isAdminUser = isDeveloperAccount(user);
  const q = isAdminUser
    ? collection(db, 'events')
    : query(collection(db, 'events'), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppEventRecord[] = snapshot.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: String(raw.id ?? d.id),
          actorEmail: raw.actorEmail ? String(raw.actorEmail) : undefined,
          actorRole:
            raw.actorRole === 'developer' || raw.actorRole === 'tester'
              ? raw.actorRole
              : undefined,
          type: raw.type as AppEventRecord['type'],
          timestamp: String(raw.timestamp ?? ''),
          summary: String(raw.summary ?? ''),
          metadata: raw.metadata as Record<string, unknown> | undefined,
        };
      });

      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onData(list.slice(0, 200));
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, eventsPath);
    }
  );
}

async function updateSharedCabinSeats(
  uid: string,
  addSeats: string[],
  removeSeats: string[]
): Promise<void> {
  const cabinRef = doc(db, 'cabin_state', 'shared');
  const path = 'cabin_state/shared';
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(cabinRef);
      const current: string[] =
        snap.exists() && Array.isArray(snap.data()?.occupiedSeats)
          ? (snap.data()?.occupiedSeats as string[])
          : [];
      const nextSet = new Set(current);
      for (const s of removeSeats) nextSet.delete(s);
      for (const s of addSeats) nextSet.add(s);
      const occupiedSeats = Array.from(nextSet).slice(0, 180);

      if (!snap.exists()) {
        tx.set(cabinRef, {
          occupiedSeats,
          lastActorUid: uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.update(cabinRef, {
          occupiedSeats,
          lastActorUid: uid,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function writeBookingsBatchToCloud(
  user: User,
  bookingsToWrite: BookingRecord[]
): Promise<void> {
  if (bookingsToWrite.length === 0) return;
  const path = 'bookings';
  try {
    if (!ensuredWorkspaceUids.has(user.uid)) {
      await ensureUserWorkspace(user);
    }
    for (let i = 0; i < bookingsToWrite.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = bookingsToWrite.slice(i, i + 400);
      for (const booking of chunk) {
        const docId = clampStr(booking.bookingId, 64);
        const ref = doc(db, 'bookings', docId);
        batch.set(ref, buildBookingFirestoreDoc(user, booking));
      }
      await batch.commit();
    }
    const addedSeats = bookingsToWrite
      .map((b) => clampStr(b.seatBooked, 6))
      .filter(Boolean);
    if (addedSeats.length > 0) {
      await updateSharedCabinSeats(user.uid, addedSeats, []);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBookingFromCloud(
  user: User,
  booking: BookingRecord
): Promise<void> {
  const path = `bookings/${booking.bookingId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'bookings', booking.bookingId));
    await batch.commit();
    await updateSharedCabinSeats(user.uid, [], [booking.seatBooked]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllBookingsInCloud(
  user: User,
  bookingsToDelete: BookingRecord[]
): Promise<void> {
  if (bookingsToDelete.length === 0) return;
  const path = 'bookings';
  try {
    for (let i = 0; i < bookingsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      for (const b of bookingsToDelete.slice(i, i + 400)) {
        batch.delete(doc(db, 'bookings', b.bookingId));
      }
      await batch.commit();
    }
    const releasedSeats = bookingsToDelete.map((b) => b.seatBooked);
    await updateSharedCabinSeats(user.uid, [], releasedSeats);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function writeEventToCloud(
  user: User,
  event: AppEventRecord
): Promise<void> {
  const eventId = clampStr(event.id, 64);
  const path = `events/${eventId}`;
  try {
    if (!ensuredWorkspaceUids.has(user.uid)) {
      await ensureUserWorkspace(user);
    }
    const payload: Record<string, unknown> = {
      ownerId: user.uid,
      actorEmail: clampStr(user.email ?? '', 254).toLowerCase(),
      actorRole: isDeveloperAccount(user) ? 'developer' : 'tester',
      id: eventId,
      type: event.type,
      timestamp: clampStr(event.timestamp, 40) || new Date().toISOString(),
      summary: clampStr(event.summary, 300) || event.type,
      serverCreatedAt: serverTimestamp(),
    };
    if (event.metadata) {
      const sanitized = sanitizeEventMetadata(event.metadata);
      if (Object.keys(sanitized).length > 0) {
        payload.metadata = sanitized;
      }
    }
    await setDoc(doc(db, 'events', eventId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearEventsInCloud(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const path = 'events';
  try {
    for (let i = 0; i < eventIds.length; i += 400) {
      const batch = writeBatch(db);
      for (const id of eventIds.slice(i, i + 400)) {
        batch.delete(doc(db, 'events', id));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
