import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowUpDown, Clock, Fuel, Star } from 'lucide-react';
import { AIRLINES, AIRPORTS, AVAILABLE_TIMES } from '../data/airlines';
import { Airline, FleetTier } from '../types/flighthub';
import {
  calculateDynamicFare,
  calculateRouteMetrics,
  computeFlightTimes,
  getTodayDateString,
} from '../utils/flightEngine';
import { AirportSelector } from './AirportSelector';
import { IsometricBlaugranaCube } from './IsometricMotif';

interface FlightFaresViewProps {
  onSelectAirlineForBooking: (airline: Airline) => void;
}

type SortKey = 'default' | 'fare-asc' | 'fare-desc' | 'speed-desc' | 'rating-desc';

const TIERS: Array<'All' | FleetTier> = [
  'All',
  'Regional Shuttle',
  'Narrowbody Jet',
  'Widebody Long-Haul',
  'Flagship Twin-Aisle',
];

export function FlightFaresView({
  onSelectAirlineForBooking,
}: FlightFaresViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('fare-asc');
  const [tierFilter, setTierFilter] = useState<'All' | FleetTier>('All');
  const [depCode, setDepCode] = useState('DEL');
  const [arrCode, setArrCode] = useState('BCN');
  const [calcAirlineCode, setCalcAirlineCode] = useState(AIRLINES[0].code);

  const calcAirline =
    AIRLINES.find((a) => a.code === calcAirlineCode) ?? AIRLINES[0];

  const routeRows = useMemo(() => {
    return AIRLINES.filter(
      (a) => tierFilter === 'All' || a.fleetTier === tierFilter
    )
      .map((airline) => {
        const metrics = calculateRouteMetrics(
          depCode,
          arrCode,
          airline.cruiseSpeedKmh
        );
        const breakdown = calculateDynamicFare(airline, depCode, arrCode);
        return { airline, metrics, breakdown };
      })
      .sort((a, b) => {
        if (sortBy === 'fare-asc')
          return a.breakdown.totalFare - b.breakdown.totalFare;
        if (sortBy === 'fare-desc')
          return b.breakdown.totalFare - a.breakdown.totalFare;
        if (sortBy === 'speed-desc')
          return b.airline.cruiseSpeedKmh - a.airline.cruiseSpeedKmh;
        if (sortBy === 'rating-desc') return b.airline.rating - a.airline.rating;
        return 0;
      });
  }, [depCode, arrCode, sortBy, tierFilter]);

  const routeMetrics = useMemo(
    () =>
      calculateRouteMetrics(depCode, arrCode, calcAirline.cruiseSpeedKmh),
    [depCode, arrCode, calcAirline.cruiseSpeedKmh]
  );

  const today = getTodayDateString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm flex items-center justify-center shrink-0 mt-0.5">
            <IsometricBlaugranaCube className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Dynamic Route Fares & Carrier Matrix
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {AIRLINES.length} global geographic carriers · Dynamic fares
              calculated from great-circle distance, Jet-A1 fuel surcharge, wind
              drag, and airport fees across {AIRPORTS.length} airports.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0D1526] rounded-lg border border-[#1E2E4E]">
          {(
            [
              { key: 'fare-asc', label: 'Lowest Fare' },
              { key: 'fare-desc', label: 'Highest Fare' },
              { key: 'speed-desc', label: 'Fastest Jet' },
              { key: 'rating-desc', label: 'Top Rated' },
              { key: 'default', label: 'Default' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sortBy === opt.key
                  ? 'bg-[#A50044] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location-Aware Route & Flight Time Explorer (Drives Dynamic Fares Below) */}
      <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E2E4E]">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Corridor Selector & Flight Time Schedule
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any origin and destination to recalculate all{' '}
              {AIRLINES.length} airline fares and timezone-adjusted arrivals.
            </p>
          </div>
          {routeMetrics.distanceKm > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono font-semibold text-slate-200 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#EDBB00]" />
                {routeMetrics.distanceKm.toLocaleString('en-IN')} km ·{' '}
                {routeMetrics.durationFormatted} ({calcAirline.code})
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#60A5FA]">
                <Fuel className="w-3.5 h-3.5 text-[#EDBB00]" />
                {routeMetrics.windFuelMultiplier > 1
                  ? 'Westbound Headwind (+8% fuel)'
                  : routeMetrics.windFuelMultiplier < 1
                    ? 'Eastbound Tailwind (-5% fuel)'
                    : 'Neutral Wind Corridor'}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_240px] gap-3 items-end">
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
            className="h-[42px] px-3 inline-flex items-center justify-center border border-[#1E2E4E] bg-[#0A1120] rounded-lg text-slate-300 hover:text-white hover:border-[#1C6DD0] hover:bg-[#121D33] transition-colors"
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
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Schedule Carrier Speed
            </label>
            <select
              id="fares-calc-airline"
              value={calcAirlineCode}
              onChange={(e) => setCalcAirlineCode(e.target.value)}
              className="w-full h-[42px] px-3 text-xs bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white focus:outline-none focus:border-[#1C6DD0]"
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
                className="border border-[#1E2E4E] rounded-lg px-4 py-3 bg-[#0A1120]"
              >
                <div className="text-[11px] text-slate-400">
                  Departs ({ft.departureTzLabel})
                </div>
                <div className="font-mono text-base font-semibold text-white tabular-nums mt-0.5">
                  {time}
                </div>
                <div className="text-[11px] text-slate-300 font-mono tabular-nums mt-1.5">
                  Arr {arrClock} {ft.arrivalTzLabel}
                  {ft.dayOffset > 0 ? ` (+${ft.dayOffset}d)` : ''}
                  {ft.dayOffset < 0 ? ` (${ft.dayOffset}d)` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fleet Tier Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0D1526] rounded-lg border border-[#1E2E4E]">
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tierFilter === tier
                  ? 'bg-[#004D98] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-slate-400 tabular-nums">
          Showing {routeRows.length} of {AIRLINES.length} carriers for {depCode}{' '}
          → {arrCode}
        </div>
      </div>

      {/* Dynamic Fares Table */}
      <div className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E2E4E] bg-[#121D33] text-xs font-semibold text-slate-300">
                <th className="py-3.5 px-4 w-12 tabular-nums">No.</th>
                <th className="py-3.5 px-4">Airline & Hub</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1">
                    Rating
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">Base + Dist.</th>
                <th className="py-3.5 px-4 text-right">Fuel & Taxes</th>
                <th className="py-3.5 px-4 text-right">Route Fare</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E4E]/80 text-sm">
              {routeRows.map(({ airline, metrics, breakdown }, idx) => (
                <tr
                  key={airline.code}
                  className="hover:bg-[#121D33]/80 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">
                      {airline.name}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      <span className="text-[#60A5FA] font-semibold">
                        {airline.code}
                      </span>{' '}
                      · {airline.hubCity}, {airline.country}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    <div>{airline.fleetTier}</div>
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {airline.cruiseSpeedKmh} km/h
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-200 tabular-nums">
                    {metrics.durationFormatted}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm text-slate-100 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-[#EDBB00] text-[#EDBB00]" />
                      {airline.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                    Rs.
                    {(
                      breakdown.baseFare + breakdown.distanceCharge
                    ).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                    <div>
                      Rs.
                      {(
                        breakdown.fuelSurcharge + breakdown.airportTaxes
                      ).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {breakdown.estimatedFuelLitres.toLocaleString('en-IN')} L
                      Jet-A1
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#EDBB00] tabular-nums">
                    Rs.{breakdown.totalFare.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectAirlineForBooking(airline)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#004D98] hover:bg-[#A50044] rounded-lg transition-colors whitespace-nowrap shrink-0"
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
    </div>
  );
}
