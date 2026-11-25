import {
  Airline,
  SeatLetter,
  SeatPreference,
  SeatType,
} from '../types/flighthub';

export { AIRPORTS } from './airports';

export const AIRLINES: Airline[] = [
  { name: 'SkyJet Airways', code: 'SJ', rating: 4.3, fare: 4500, cruiseSpeedKmh: 860 },
  { name: 'BlueHorizon Airlines', code: 'BH', rating: 3.9, fare: 4000, cruiseSpeedKmh: 840 },
  { name: 'AeroNova', code: 'AN', rating: 4.7, fare: 5500, cruiseSpeedKmh: 885 },
  { name: 'SunVista Air', code: 'SV', rating: 3.6, fare: 3500, cruiseSpeedKmh: 820 },
  { name: 'CloudNine Aviation', code: 'CN', rating: 4.8, fare: 6000, cruiseSpeedKmh: 905 },
  { name: 'Global Wings', code: 'GW', rating: 3.4, fare: 3000, cruiseSpeedKmh: 800 },
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
