export type SeatType = 'Window' | 'Middle' | 'Aisle';

export type SeatPreference = SeatType | 'No Preference';

export type SeatLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type FleetTier =
  | 'Regional Shuttle'
  | 'Narrowbody Jet'
  | 'Widebody Long-Haul'
  | 'Flagship Twin-Aisle';

export interface Airline {
  name: string;
  code: string;
  hubCity: string;
  country: string;
  fleetTier: FleetTier;
  rating: number;
  fare: number;
  baseFee: number;
  ratePerKm: number;
  fuelSurchargePerKm: number;
  fuelBurnLitresPerKm: number;
  cruiseSpeedKmh: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  fuelSurcharge: number;
  airportTaxes: number;
  windFuelMultiplier: number;
  totalFare: number;
  estimatedFuelLitres: number;
  distanceKm: number;
  isInternational: boolean;
}

export interface AirportInfo {
  code: string;
  name: string;
  city: string;
  country: string;
  region:
    | 'India'
    | 'Asia-Pacific'
    | 'Middle East'
    | 'Europe'
    | 'North America'
    | 'South America'
    | 'Africa'
    | 'Oceania';
  lat: number;
  lon: number;
  timezone: string;
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

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet';

export interface PaymentDetails {
  gateway: 'Razorpay';
  method: PaymentMethod;
  referenceId: string;
  orderId: string;
  accountMasked: string;
  contact: string;
  email: string;
  status: 'Paid';
  paidAt: string;
}

export const DEVELOPER_ADMIN_EMAIL_SHA256 =
  'aab3ebc6f3c860051d4b23dac37cfdec75892f6bb63b2d325eb2843ee8fc6218';

export interface BookingRecord {
  bookingId: string;
  actorEmail?: string;
  actorRole?: 'developer' | 'tester';
  passengerName: string;
  citizenship: string;
  seatPreference: SeatPreference;
  seatBooked: string;
  preferenceStatus: PreferenceStatus;
  airline: string;
  airlineCode: string;
  departureDateTime: string;
  departureAirport: string;
  departureTzLabel?: string;
  arrivalDateTime: string;
  arrivalAirport: string;
  arrivalTzLabel?: string;
  durationMinutes?: number;
  distanceKm?: number;
  fare: number;
  fareBreakdown?: FareBreakdown;
  payment?: PaymentDetails;
  createdAt: string;
}

export interface PassengerDraft {
  id: string;
  name: string;
  citizenship: string;
  preference: SeatPreference;
}

export type AppEventType =
  | 'SESSION_BOOT'
  | 'BOOKING_CREATED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_DECLINED'
  | 'TICKET_CANCELLED'
  | 'TICKET_SEARCHED'
  | 'SAMPLE_DATA_LOADED'
  | 'CABIN_RESET';

export interface AppEventRecord {
  id: string;
  actorEmail?: string;
  actorRole?: 'developer' | 'tester';
  type: AppEventType;
  timestamp: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export type WorkspaceTab =
  | 'book'
  | 'view'
  | 'cancel'
  | 'fares'
  | 'seats'
  | 'developer';
