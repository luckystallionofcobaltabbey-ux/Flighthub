import { useMemo, useState } from 'react';
import { SEAT_COLUMNS, TOTAL_ROWS } from '../data/airlines';
import { BookingRecord, SeatRecord, SeatType } from '../types/flighthub';
import { TicketCard } from './TicketCard';

interface CabinSeatMapViewProps {
  seats: SeatRecord[];
  bookings: BookingRecord[];
  onRequestCancel: (bookingId: string) => void;
}

type SeatFilter = 'All' | 'Available' | 'Booked' | SeatType;

export function CabinSeatMapView({
  seats,
  bookings,
  onRequestCancel,
}: CabinSeatMapViewProps) {
  const [filter, setFilter] = useState<SeatFilter>('All');
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(
    null
  );

  const stats = useMemo(() => {
    const booked = seats.filter((s) => s.isBooked).length;
    const open = seats.length - booked;
    return {
      total: seats.length,
      booked,
      open,
      windowOpen: seats.filter((s) => !s.isBooked && s.seatType === 'Window')
        .length,
      middleOpen: seats.filter((s) => !s.isBooked && s.seatType === 'Middle')
        .length,
      aisleOpen: seats.filter((s) => !s.isBooked && s.seatType === 'Aisle')
        .length,
    };
  }, [seats]);

  const seatMapByNumber = useMemo(() => {
    const map = new Map<string, SeatRecord>();
    seats.forEach((s) => map.set(s.seatNumber, s));
    return map;
  }, [seats]);

  const selectedSeat = selectedSeatNumber
    ? seatMapByNumber.get(selectedSeatNumber) ?? null
    : null;

  const selectedBooking = selectedSeat?.bookingId
    ? bookings.find((b) => b.bookingId === selectedSeat.bookingId) ?? null
    : null;

  const matchesFilter = (seat: SeatRecord) => {
    if (filter === 'All') return true;
    if (filter === 'Available') return !seat.isBooked;
    if (filter === 'Booked') return seat.isBooked;
    return seat.seatType === filter;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Cabin Seat Map (1A – 30F)
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Live 180-seat cabin inventory across 30 rows. Click any seat to
            inspect its allocation status or boarding ticket.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#18181B] rounded-lg border border-zinc-800">
          {(
            ['All', 'Available', 'Booked', 'Window', 'Middle', 'Aisle'] as const
          ).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === f
                  ? 'bg-[#E50914] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Availability Summary Strip */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-6 py-4 grid grid-cols-2 sm:grid-cols-5 gap-6">
        <div>
          <div className="text-xs text-zinc-400">Total Seats</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-white tabular-nums">
            {stats.total}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Available</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-emerald-400 tabular-nums">
            {stats.open}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Booked</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-[#E50914] tabular-nums">
            {stats.booked}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Open Window / Aisle</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-200 tabular-nums">
            {stats.windowOpen} W · {stats.aisleOpen} A
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Open Middle</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-200 tabular-nums">
            {stats.middleOpen} M
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cabin Grid */}
        <div className="lg:col-span-7 bg-[#18181B] border border-zinc-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800 text-xs text-zinc-400">
            <div className="font-medium text-zinc-200">
              3-3 Configuration (A/F Window · B/E Middle · C/D Aisle)
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#111114] border border-zinc-700 inline-block" />
                Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#E50914] inline-block" />
                Booked
              </span>
            </div>
          </div>

          {/* Column Headers */}
          <div className="mt-4 grid grid-cols-[32px_1fr_1fr_1fr_24px_1fr_1fr_1fr] gap-1.5 text-center text-xs font-mono font-semibold text-zinc-400 pb-2">
            <span />
            {SEAT_COLUMNS.slice(0, 3).map((c) => (
              <span key={c.letter}>
                {c.letter}{' '}
                <span className="font-sans font-normal text-zinc-500">
                  ({c.type[0]})
                </span>
              </span>
            ))}
            <span />
            {SEAT_COLUMNS.slice(3, 6).map((c) => (
              <span key={c.letter}>
                {c.letter}{' '}
                <span className="font-sans font-normal text-zinc-500">
                  ({c.type[0]})
                </span>
              </span>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
            {Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1).map((row) => {
              const renderSeatBtn = (letter: string) => {
                const seatNum = `${row}${letter}`;
                const seat = seatMapByNumber.get(seatNum);
                if (!seat) return null;
                const dimmed = !matchesFilter(seat);
                const isSelected = selectedSeatNumber === seatNum;

                return (
                  <button
                    key={seatNum}
                    type="button"
                    onClick={() => setSelectedSeatNumber(seatNum)}
                    title={`${seatNum} (${seat.seatType}) — ${
                      seat.isBooked ? `Booked (${seat.bookingId})` : 'Available'
                    }`}
                    className={`h-8 rounded-md font-mono text-xs font-medium transition-colors tabular-nums ${
                      seat.isBooked
                        ? 'bg-[#E50914] text-white hover:bg-[#F40612]'
                        : 'bg-[#111114] text-zinc-300 border border-zinc-800 hover:border-zinc-500 hover:text-white'
                    } ${isSelected ? 'ring-2 ring-offset-1 ring-offset-[#18181B] ring-white' : ''} ${
                      dimmed ? 'opacity-20' : ''
                    }`}
                  >
                    {seatNum}
                  </button>
                );
              };

              return (
                <div
                  key={row}
                  className="grid grid-cols-[32px_1fr_1fr_1fr_24px_1fr_1fr_1fr] gap-1.5 items-center"
                >
                  <span className="font-mono text-xs text-zinc-500 text-right pr-1 tabular-nums">
                    {row}
                  </span>
                  {renderSeatBtn('A')}
                  {renderSeatBtn('B')}
                  {renderSeatBtn('C')}
                  <span className="text-center text-zinc-700 text-xs select-none">
                    |
                  </span>
                  {renderSeatBtn('D')}
                  {renderSeatBtn('E')}
                  {renderSeatBtn('F')}
                </div>
              );
            })}
          </div>
        </div>

        {/* Seat Inspector Panel */}
        <div className="lg:col-span-5 space-y-4">
          {!selectedSeat ? (
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 text-sm text-zinc-400">
              <h2 className="font-display text-base font-semibold text-white">
                Seat Inspector
              </h2>
              <p className="mt-1.5">
                Select any seat from the cabin map to verify its seat type (
                <span className="font-medium text-zinc-200">
                  Window / Middle / Aisle
                </span>
                ) or view the assigned passenger booking.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-zinc-400">Selected Seat</div>
                    <div className="mt-0.5 font-mono text-2xl font-bold text-white tabular-nums">
                      {selectedSeat.seatNumber}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Row {selectedSeat.row} · {selectedSeat.seatType} Seat
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      selectedSeat.isBooked
                        ? 'text-[#E50914]'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedSeat.isBooked ? 'Booked' : 'Available'}
                  </span>
                </div>

                {!selectedSeat.isBooked && (
                  <p className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-400">
                    This {selectedSeat.seatType.toLowerCase()} seat is currently
                    open and eligible for automated allocation when booking.
                  </p>
                )}
              </div>

              {selectedBooking && (
                <TicketCard
                  ticket={selectedBooking}
                  compact
                  onRequestCancel={onRequestCancel}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
