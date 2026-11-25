import { Airline, SeatLetter, SeatPreference, SeatType } from '../types/flighthub';

export const AIRLINES: Airline[] = [
  { name: 'SkyJet Airways', code: 'SJ', rating: 4.3, fare: 4500 },
  { name: 'BlueHorizon Airlines', code: 'BH', rating: 3.9, fare: 4000 },
  { name: 'AeroNova', code: 'AN', rating: 4.7, fare: 5500 },
  { name: 'SunVista Air', code: 'SV', rating: 3.6, fare: 3500 },
  { name: 'CloudNine Aviation', code: 'CN', rating: 4.8, fare: 6000 },
  { name: 'Global Wings', code: 'GW', rating: 3.4, fare: 3000 },
];

export const AVAILABLE_TIMES: string[] = [
  '06:00',
  '09:00',
  '12:00',
  '15:00',
  '18:00',
  '21:00',
];

export const SEAT_PREFERENCES: SeatPreference[] = [
  'Window',
  'Middle',
  'Aisle',
  'No Preference',
];

export const SEAT_COLUMNS: Array<{ letter: SeatLetter; type: SeatType }> = [
  { letter: 'A', type: 'Window' },
  { letter: 'B', type: 'Middle' },
  { letter: 'C', type: 'Aisle' },
  { letter: 'D', type: 'Aisle' },
  { letter: 'E', type: 'Middle' },
  { letter: 'F', type: 'Window' },
];

export const TOTAL_ROWS = 30;
export const TOTAL_SEATS = TOTAL_ROWS * SEAT_COLUMNS.length; // 180 seats (1A to 30F)

export const POPULAR_AIRPORTS: Array<{ code: string; city: string }> = [
  { code: 'DEL', city: 'New Delhi' },
  { code: 'BOM', city: 'Mumbai' },
  { code: 'BLR', city: 'Bengaluru' },
  { code: 'MAA', city: 'Chennai' },
  { code: 'HYD', city: 'Hyderabad' },
  { code: 'CCU', city: 'Kolkata' },
  { code: 'GOI', city: 'Goa' },
  { code: 'DXB', city: 'Dubai' },
  { code: 'SIN', city: 'Singapore' },
  { code: 'LHR', city: 'London' },
];
