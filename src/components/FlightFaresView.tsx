import { useState } from 'react';
import { ArrowUpDown, Star } from 'lucide-react';
import { AIRLINES, AVAILABLE_TIMES } from '../data/airlines';
import { Airline } from '../types/flighthub';

interface FlightFaresViewProps {
  onSelectAirlineForBooking: (airline: Airline) => void;
}

type SortKey = 'default' | 'fare-asc' | 'fare-desc' | 'rating-desc';

export function FlightFaresView({
  onSelectAirlineForBooking,
}: FlightFaresViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const sortedAirlines = [...AIRLINES].sort((a, b) => {
    if (sortBy === 'fare-asc') return a.fare - b.fare;
    if (sortBy === 'fare-desc') return b.fare - a.fare;
    if (sortBy === 'rating-desc') return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Flight Fares & Carrier Lineup
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Standard one-way cabin fares across all 6 FlightHub Lmtd partner
            carriers with fixed 3-hour flight windows.
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

      {/* Daily Departure Windows */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Daily Departure Windows
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              All carriers operate on 6 fixed daily departure slots with an
              automated 3-hour arrival window.
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-400 tabular-nums">
            6 departures daily · +3h flight duration
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {AVAILABLE_TIMES.map((time) => {
            const [hr, min] = time.split(':').map(Number);
            const arrHr = (hr + 3) % 24;
            const arrStr = `${String(arrHr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            return (
              <div
                key={time}
                className="border border-zinc-800 rounded-lg px-4 py-3 bg-[#111114]"
              >
                <div className="text-xs text-zinc-400">Departs</div>
                <div className="font-mono text-base font-semibold text-white tabular-nums mt-0.5">
                  {time}
                </div>
                <div className="text-xs text-zinc-400 font-mono tabular-nums mt-1">
                  Arrives {arrStr}
                  {hr + 3 >= 24 ? ' (+1d)' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
