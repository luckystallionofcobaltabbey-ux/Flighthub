import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowUpDown, Clock, Star } from 'lucide-react';
import { AIRLINES, AIRPORTS, AVAILABLE_TIMES } from '../data/airlines';
import { Airline } from '../types/flighthub';
import {
  calculateRouteMetrics,
  computeFlightTimes,
  getTodayDateString,
} from '../utils/flightEngine';
import { AirportSelector } from './AirportSelector';

interface FlightFaresViewProps {
  onSelectAirlineForBooking: (airline: Airline) => void;
}

type SortKey = 'default' | 'fare-asc' | 'fare-desc' | 'rating-desc';

export function FlightFaresView({
  onSelectAirlineForBooking,
}: FlightFaresViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [depCode, setDepCode] = useState('DEL');
  const [arrCode, setArrCode] = useState('LHR');
  const [calcAirlineCode, setCalcAirlineCode] = useState(AIRLINES[2].code);

  const sortedAirlines = [...AIRLINES].sort((a, b) => {
    if (sortBy === 'fare-asc') return a.fare - b.fare;
    if (sortBy === 'fare-desc') return b.fare - a.fare;
    if (sortBy === 'rating-desc') return b.rating - a.rating;
    return 0;
  });

  const calcAirline =
    AIRLINES.find((a) => a.code === calcAirlineCode) ?? AIRLINES[0];

  const routeMetrics = useMemo(
    () =>
      calculateRouteMetrics(depCode, arrCode, calcAirline.cruiseSpeedKmh),
    [depCode, arrCode, calcAirline.cruiseSpeedKmh]
  );

  const today = getTodayDateString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Flight Fares & Route Time Matrix
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Carrier fares, cruise speeds, and timezone-aware travel duration
            calculator across {AIRPORTS.length} global airports.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#18181B] rounded-lg border border-zinc-800">
          {(
            [
              { key: 'default', label: 'Default' },
              { key: 'fare-asc', label: 'Lowest Fare' },
              { key: 'fare-desc', label: 'Highest Fare' },
              { key: 'rating-desc', label: 'Top Rated' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === opt.key
                  ? 'bg-[#E50914] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fares Table */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-[#1F1F23] text-xs font-semibold text-zinc-400">
                <th className="py-3.5 px-5 w-16 tabular-nums">No.</th>
                <th className="py-3.5 px-5">Airline</th>
                <th className="py-3.5 px-5">Code</th>
                <th className="py-3.5 px-5">Cruise Speed</th>
                <th className="py-3.5 px-5">
                  <span className="inline-flex items-center gap-1">
                    Rating
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </span>
                </th>
                <th className="py-3.5 px-5 text-right">Fare (Per Passenger)</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-sm">
              {sortedAirlines.map((airline, idx) => (
                <tr
                  key={airline.code}
                  className="hover:bg-zinc-900/70 transition-colors"
                >
                  <td className="py-3.5 px-5 font-mono text-xs text-zinc-500 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-white">
                    {airline.name}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-zinc-300">
                    {airline.code}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs text-zinc-400 tabular-nums">
                    {airline.cruiseSpeedKmh} km/h
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-200 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {airline.rating.toFixed(1)} / 5
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-white tabular-nums">
                    Rs.{airline.fare.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectAirlineForBooking(airline)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Book Flight
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location-Aware Flight Time Explorer */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Route Flight Time & Timezone Schedule
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compare great-circle distance, carrier-adjusted duration, and
              local arrival times across {AIRPORTS.length} airports.
            </p>
          </div>
          {routeMetrics.distanceKm > 0 && (
            <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#E50914]" />
              {routeMetrics.distanceKm.toLocaleString('en-IN')} km ·{' '}
              {routeMetrics.durationFormatted} ({calcAirline.code})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_200px] gap-3 items-end">
          <AirportSelector
            id="fares-dep-airport"
            label="Origin Airport"
            value={depCode}
            excludeCode={arrCode}
            onChange={setDepCode}
          />
          <button
            type="button"
            onClick={() => {
              setDepCode(arrCode);
              setArrCode(depCode);
            }}
            aria-label="Swap origin and destination"
            className="h-[42px] px-3 inline-flex items-center justify-center border border-zinc-700 bg-[#111114] rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <AirportSelector
            id="fares-arr-airport"
            label="Destination Airport"
            value={arrCode}
            excludeCode={depCode}
            onChange={setArrCode}
          />
          <div>
            <label
              htmlFor="fares-calc-airline"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Carrier Speed
            </label>
            <select
              id="fares-calc-airline"
              value={calcAirlineCode}
              onChange={(e) => setCalcAirlineCode(e.target.value)}
              className="w-full h-[42px] px-3 text-xs bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914]"
            >
              {AIRLINES.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name} ({a.cruiseSpeedKmh} km/h)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {AVAILABLE_TIMES.map((time) => {
            const ft = computeFlightTimes(
              today,
              time,
              depCode,
              arrCode,
              calcAirline.cruiseSpeedKmh
            );
            const arrClock = ft.arrivalDateTime.split(' ')[1]?.slice(0, 5);
            return (
              <div
                key={time}
                className="border border-zinc-800 rounded-lg px-4 py-3 bg-[#111114]"
              >
                <div className="text-[11px] text-zinc-400">
                  Departs ({ft.departureTzLabel})
                </div>
                <div className="font-mono text-base font-semibold text-white tabular-nums mt-0.5">
                  {time}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono tabular-nums mt-1.5">
                  Arr {arrClock} {ft.arrivalTzLabel}
                  {ft.dayOffset > 0 ? ` (+${ft.dayOffset}d)` : ''}
                  {ft.dayOffset < 0 ? ` (${ft.dayOffset}d)` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
