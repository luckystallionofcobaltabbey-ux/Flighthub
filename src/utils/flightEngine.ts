import { AIRLINES, SEAT_COLUMNS, TOTAL_ROWS } from '../data/airlines';
import {
  Airline,
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

/**
 * Mirrors Python allocate_seat(preference):
 * - Searches lowest row then seatNumber for unbooked seat matching preference
 * - Falls back to lowest row then seatNumber across all unbooked seats
 */
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

export function computeFlightTimes(
  travelDate: string,
  departureTime: string
): { departureDateTime: string; arrivalDateTime: string } {
  const [year, month, day] = travelDate.split('-').map(Number);
  const [hour, minute] = departureTime.split(':').map(Number);

  const dep = new Date(year, month - 1, day, hour, minute, 0);
  const arr = new Date(dep.getTime() + 3 * 60 * 60 * 1000);

  return {
    departureDateTime: formatDateTime(dep),
    arrivalDateTime: formatDateTime(arr),
  };
}

export function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function formatDisplayDateTime(dt: string): string {
  const [datePart, timePart] = dt.split(' ');
  if (!timePart) return dt;
  return `${datePart} · ${timePart.slice(0, 5)}`;
}

export function generatePaymentReference(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `TXN-FH-${randomDigits}`;
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
  const { departureDateTime, arrivalDateTime } = computeFlightTimes(
    travelDate,
    departureTime
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
      departureDateTime,
      departureAirport: departureAirport.trim().toUpperCase(),
      arrivalDateTime,
      arrivalAirport: arrivalAirport.trim().toUpperCase(),
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
    arrivalAirport: 'BOM',
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
      method: 'Card',
      referenceId: 'TXN-FH-482910',
      accountMasked: '•••• 4242',
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
      method: 'UPI',
      referenceId: 'TXN-FH-917304',
      accountMasked: 'aarav@okaxis',
      status: 'Paid',
      paidAt: new Date().toISOString(),
    },
  });

  return {
    updatedBookings: res2.updatedBookings,
    updatedSeats: res2.updatedSeats,
  };
}
