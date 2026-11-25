export type SeatType = 'Window' | 'Middle' | 'Aisle';

export type SeatPreference = SeatType | 'No Preference';

export type SeatLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Airline {
  name: string;
  code: string;
  rating: number;
  fare: number;
}

export interface SeatRecord {
  seatNumber: string;
  row: number;
  letter: SeatLetter;
  seatType: SeatType;
  isBooked: boolean;
  bookingId: string | null;
}

export type PreferenceStatus =
  | 'Preferred seat assigned'
  | 'Any available seat assigned'
  | 'Preferred seat unavailable; alternative seat assigned';

export type PaymentMethod = 'Card' | 'UPI' | 'NetBanking';

export interface PaymentDetails {
  method: PaymentMethod;
  referenceId: string;
  accountMasked: string;
  status: 'Paid';
  paidAt: string;
}

export interface BookingRecord {
  bookingId: string;
  passengerName: string;
  citizenship: string;
  seatPreference: SeatPreference;
  seatBooked: string;
  preferenceStatus: PreferenceStatus;
  airline: string;
  airlineCode: string;
  departureDateTime: string;
  departureAirport: string;
  arrivalDateTime: string;
  arrivalAirport: string;
  fare: number;
  payment?: PaymentDetails;
  createdAt: string;
}

export interface PassengerDraft {
  id: string;
  name: string;
  citizenship: string;
  preference: SeatPreference;
}

export type WorkspaceTab = 'book' | 'view' | 'cancel' | 'fares' | 'seats';
