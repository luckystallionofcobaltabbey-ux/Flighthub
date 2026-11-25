import { AIRLINES, AIRPORTS, SEAT_COLUMNS, TOTAL_ROWS } from '../data/airlines';
import {
  Airline,
  AirportInfo,
  BookingRecord,
  PassengerDraft,
  PaymentDetails,
  PreferenceStatus,
  SeatPreference,
  SeatRecord,
} from '../types/flighthub';

export function createInitialSeats(): SeatRecord[] {
  const seats: SeatRecord[] = [];
  for (let row = 1; row <= TOTAL_ROWS; row++) {
    for (const col of SEAT_COLUMNS) {
      seats.push({
        seatNumber: `${row}${col.letter}`,
        row,
        letter: col.letter,
        seatType: col.type,
        isBooked: false,
        bookingId: null,
      });
    }
  }
  return seats;
}

export function findAirport(code: string): AirportInfo | undefined {
  const upper = code.trim().toUpperCase();
  return AIRPORTS.find((a) => a.code === upper);
}

/**
 * Great-circle Haversine distance in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDurationMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Computes distance and realistic jet flight duration between two airports,
 * varying by carrier cruise speed, climb/descent buffer, and prevailing jetstream direction.
 */
export function calculateRouteMetrics(
  depCode: string,
  arrCode: string,
  cruiseSpeedKmh = 855
): {
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  depAirport?: AirportInfo;
  arrAirport?: AirportInfo;
} {
  const depAirport = findAirport(depCode);
  const arrAirport = findAirport(arrCode);

  if (!depAirport || !arrAirport || depAirport.code === arrAirport.code) {
    return {
      distanceKm: 0,
      durationMinutes: 180,
      durationFormatted: '3h 00m',
      depAirport,
      arrAirport,
    };
  }

  const distanceKm = haversineDistanceKm(
    depAirport.lat,
    depAirport.lon,
    arrAirport.lat,
    arrAirport.lon
  );

  let rawMinutes = (distanceKm / cruiseSpeedKmh) * 60 + 35;

  // Prevailing mid-latitude jetstream effect on long-haul east/west corridors
  if (distanceKm > 2500) {
    let lonDelta = arrAirport.lon - depAirport.lon;
    if (lonDelta > 180) lonDelta -= 360;
    if (lonDelta < -180) lonDelta += 360;

    if (lonDelta > 35) rawMinutes *= 0.96; // Eastbound tailwind
    else if (lonDelta < -35) rawMinutes *= 1.05; // Westbound headwind
  }

  const rounded = Math.max(50, Math.round(rawMinutes / 5) * 5);
  return {
    distanceKm,
    durationMinutes: rounded,
    durationFormatted: formatDurationMinutes(rounded),
    depAirport,
    arrAirport,
  };
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    const hour = map.hour === '24' ? '00' : map.hour;
    const asUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(hour),
      Number(map.minute),
      Number(map.second)
    );
    return asUtc - date.getTime();
  } catch {
    return 0;
  }
}

export function getShortTimezoneLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return 'UTC';
  }
}

function formatInstantInZone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    const hour = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
  } catch {
    return formatDateTime(date);
  }
}

/**
 * Converts (travelDate, departureTime) in the Departure Airport's local timezone
 * into an exact UTC instant, adds the calculated route duration (adjusted for carrier speed),
 * and projects the arrival timestamp into the Arrival Airport's local timezone.
 */
export function computeFlightTimes(
  travelDate: string,
  departureTime: string,
  depCode = 'DEL',
  arrCode = 'BOM',
  cruiseSpeedKmh = 855
): {
  departureDateTime: string;
  arrivalDateTime: string;
  departureTzLabel: string;
  arrivalTzLabel: string;
  durationMinutes: number;
  durationFormatted: string;
  distanceKm: number;
  dayOffset: number;
} {
  const metrics = calculateRouteMetrics(depCode, arrCode, cruiseSpeedKmh);
  const depZone = metrics.depAirport?.timezone ?? 'Asia/Kolkata';
  const arrZone = metrics.arrAirport?.timezone ?? 'Asia/Kolkata';

  const [year, month, day] = travelDate.split('-').map(Number);
  const [hour, minute] = departureTime.split(':').map(Number);

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const depOffset1 = getTimezoneOffsetMs(new Date(naiveUtc), depZone);
  const depInstant = new Date(naiveUtc - depOffset1);
  const arrInstant = new Date(
    depInstant.getTime() + metrics.durationMinutes * 60 * 1000
  );

  const departureDateTime = formatInstantInZone(depInstant, depZone);
  const arrivalDateTime = formatInstantInZone(arrInstant, arrZone);

  const depDayNum = Date.UTC(
    Number(departureDateTime.slice(0, 4)),
    Number(departureDateTime.slice(5, 7)) - 1,
    Number(departureDateTime.slice(8, 10))
  );
  const arrDayNum = Date.UTC(
    Number(arrivalDateTime.slice(0, 4)),
    Number(arrivalDateTime.slice(5, 7)) - 1,
    Number(arrivalDateTime.slice(8, 10))
  );
  const dayOffset = Math.round((arrDayNum - depDayNum) / 86_400_000);

  return {
    departureDateTime,
    arrivalDateTime,
    departureTzLabel: getShortTimezoneLabel(depInstant, depZone),
    arrivalTzLabel: getShortTimezoneLabel(arrInstant, arrZone),
    durationMinutes: metrics.durationMinutes,
    durationFormatted: metrics.durationFormatted,
    distanceKm: metrics.distanceKm,
    dayOffset,
  };
}

export function allocateSeat(
  seats: SeatRecord[],
  preference: SeatPreference
): { seatNumber: string; preferenceMet: boolean } | null {
  const sortedAvailable = seats
    .filter((s) => !s.isBooked)
    .sort((a, b) => a.row - b.row || a.seatNumber.localeCompare(b.seatNumber));

  if (sortedAvailable.length === 0) {
    return null;
  }

  if (preference !== 'No Preference') {
    const preferred = sortedAvailable.find((s) => s.seatType === preference);
    if (preferred) {
      return { seatNumber: preferred.seatNumber, preferenceMet: true };
    }
  }

  return { seatNumber: sortedAvailable[0].seatNumber, preferenceMet: false };
}

export function getPreferenceStatus(
  preference: SeatPreference,
  preferenceMet: boolean
): PreferenceStatus {
  if (preference === 'No Preference') {
    return 'Any available seat assigned';
  }
  return preferenceMet
    ? 'Preferred seat assigned'
    : 'Preferred seat unavailable; alternative seat assigned';
}

export function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function formatDisplayDateTime(dt: string, tzLabel?: string): string {
  const [datePart, timePart] = dt.split(' ');
  if (!timePart) return dt;
  const base = `${datePart} · ${timePart.slice(0, 5)}`;
  return tzLabel ? `${base} ${tzLabel}` : base;
}

export function generateRazorpayPaymentId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 14; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `pay_${suffix}`;
}

export function generateRazorpayOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 14; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `order_${suffix}`;
}

export function generateBookingId(
  airlineCode: string,
  travelDate: string,
  departureTime: string,
  passengerNumber: number,
  takenIds: Set<string>
): string {
  const dateCompact = travelDate.replace(/-/g, '');
  const timeCompact = departureTime.replace(':', '');
  const suffix = String(passengerNumber).padStart(2, '0');
  const baseId = `${airlineCode}${dateCompact}${timeCompact}${suffix}`;

  if (!takenIds.has(baseId)) {
    return baseId;
  }

  const micro = String(Date.now()).slice(-6);
  let candidate = `${airlineCode}${dateCompact}${timeCompact}${micro}${suffix}`;
  let counter = 1;
  while (takenIds.has(candidate)) {
    candidate = `${airlineCode}${dateCompact}${timeCompact}${micro}${counter}${suffix}`;
    counter++;
  }
  return candidate;
}

export function createBookingsTransaction(params: {
  seats: SeatRecord[];
  existingBookings: BookingRecord[];
  airline: Airline;
  departureAirport: string;
  arrivalAirport: string;
  travelDate: string;
  departureTime: string;
  passengers: PassengerDraft[];
  payment?: PaymentDetails;
}): {
  createdBookings: BookingRecord[];
  updatedBookings: BookingRecord[];
  updatedSeats: SeatRecord[];
} {
  const {
    seats,
    existingBookings,
    airline,
    departureAirport,
    arrivalAirport,
    travelDate,
    departureTime,
    passengers,
    payment,
  } = params;

  const freeSeatsCount = seats.filter((s) => !s.isBooked).length;
  if (freeSeatsCount < passengers.length) {
    throw new Error('Not enough seats available.');
  }

  const workingSeats = seats.map((s) => ({ ...s }));
  const takenIds = new Set(existingBookings.map((b) => b.bookingId));
  const flightTimes = computeFlightTimes(
    travelDate,
    departureTime,
    departureAirport,
    arrivalAirport,
    airline.cruiseSpeedKmh
  );

  const createdBookings: BookingRecord[] = [];

  passengers.forEach((passenger, idx) => {
    const bookingId = generateBookingId(
      airline.code,
      travelDate,
      departureTime,
      idx + 1,
      takenIds
    );
    takenIds.add(bookingId);

    const allocation = allocateSeat(workingSeats, passenger.preference);
    if (!allocation) {
      throw new Error('No seats available.');
    }

    const seatIdx = workingSeats.findIndex(
      (s) => s.seatNumber === allocation.seatNumber
    );
    workingSeats[seatIdx] = {
      ...workingSeats[seatIdx],
      isBooked: true,
      bookingId,
    };

    const record: BookingRecord = {
      bookingId,
      passengerName: passenger.name.trim(),
      citizenship: passenger.citizenship.trim(),
      seatPreference: passenger.preference,
      seatBooked: allocation.seatNumber,
      preferenceStatus: getPreferenceStatus(
        passenger.preference,
        allocation.preferenceMet
      ),
      airline: airline.name,
      airlineCode: airline.code,
      departureDateTime: flightTimes.departureDateTime,
      departureAirport: departureAirport.trim().toUpperCase(),
      departureTzLabel: flightTimes.departureTzLabel,
      arrivalDateTime: flightTimes.arrivalDateTime,
      arrivalAirport: arrivalAirport.trim().toUpperCase(),
      arrivalTzLabel: flightTimes.arrivalTzLabel,
      durationMinutes: flightTimes.durationMinutes,
      distanceKm: flightTimes.distanceKm,
      fare: airline.fare,
      payment,
      createdAt: new Date().toISOString(),
    };

    createdBookings.push(record);
  });

  return {
    createdBookings,
    updatedBookings: [...createdBookings, ...existingBookings],
    updatedSeats: workingSeats,
  };
}

export function cancelBookingTransaction(
  bookings: BookingRecord[],
  seats: SeatRecord[],
  bookingId: string
): {
  cancelledBooking: BookingRecord;
  updatedBookings: BookingRecord[];
  updatedSeats: SeatRecord[];
} {
  const target = bookings.find(
    (b) => b.bookingId.toUpperCase() === bookingId.trim().toUpperCase()
  );
  if (!target) {
    throw new Error('Booking not found.');
  }

  const updatedSeats = seats.map((s) =>
    s.seatNumber === target.seatBooked
      ? { ...s, isBooked: false, bookingId: null }
      : s
  );

  const updatedBookings = bookings.filter(
    (b) => b.bookingId !== target.bookingId
  );

  return {
    cancelledBooking: target,
    updatedBookings,
    updatedSeats,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
}

export function buildSampleBookings(
  currentSeats: SeatRecord[],
  existingBookings: BookingRecord[]
): { updatedBookings: BookingRecord[]; updatedSeats: SeatRecord[] } {
  const today = getTodayDateString();
  const res1 = createBookingsTransaction({
    seats: currentSeats,
    existingBookings,
    airline: AIRLINES[2], // AeroNova AN
    departureAirport: 'DEL',
    arrivalAirport: 'LHR',
    travelDate: today,
    departureTime: '09:00',
    passengers: [
      {
        id: 'sample-1',
        name: 'Aarav Mehta',
        citizenship: 'Indian',
        preference: 'Window',
      },
      {
        id: 'sample-2',
        name: 'Priya Nair',
        citizenship: 'Indian',
        preference: 'Aisle',
      },
    ],
    payment: {
      gateway: 'Razorpay',
      method: 'Card',
      referenceId: 'pay_FH94Kx28LmPq71',
      orderId: 'order_FH82Qz19NpRw40',
      accountMasked: '•••• 4242',
      contact: '+91 98765 43210',
      email: 'aarav.mehta@example.com',
      status: 'Paid',
      paidAt: new Date().toISOString(),
    },
  });

  const res2 = createBookingsTransaction({
    seats: res1.updatedSeats,
    existingBookings: res1.updatedBookings,
    airline: AIRLINES[0], // SkyJet SJ
    departureAirport: 'BLR',
    arrivalAirport: 'SIN',
    travelDate: today,
    departureTime: '18:00',
    passengers: [
      {
        id: 'sample-3',
        name: 'Aarav Mehta',
        citizenship: 'Indian',
        preference: 'Window',
      },
    ],
    payment: {
      gateway: 'Razorpay',
      method: 'UPI',
      referenceId: 'pay_FH71Lm44VrSt09',
      orderId: 'order_FH60Ty88WxZa12',
      accountMasked: 'aarav@okaxis',
      contact: '+91 98765 43210',
      email: 'aarav.mehta@example.com',
      status: 'Paid',
      paidAt: new Date().toISOString(),
    },
  });

  return {
    updatedBookings: res2.updatedBookings,
    updatedSeats: res2.updatedSeats,
  };
}
