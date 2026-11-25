import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { BookingRecord } from '../types/flighthub';
import { TicketCard } from './TicketCard';

interface CancelTicketViewProps {
  bookings: BookingRecord[];
  initialBookingId?: string | null;
  onConfirmCancel: (bookingId: string) => BookingRecord;
  onGoToSeats: () => void;
}

export function CancelTicketView({
  bookings,
  initialBookingId,
  onConfirmCancel,
  onGoToSeats,
}: CancelTicketViewProps) {
  const [bookingIdInput, setBookingIdInput] = useState(
    initialBookingId ?? ''
  );
  const [lookupAttempted, setLookupAttempted] = useState(
    Boolean(initialBookingId)
  );
  const [cancelledResult, setCancelledResult] = useState<BookingRecord | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialBookingId) {
      setBookingIdInput(initialBookingId);
      setLookupAttempted(true);
      setCancelledResult(null);
      setErrorMsg(null);
    }
  }, [initialBookingId]);

  const normalizedQuery = bookingIdInput.trim().toUpperCase();
  const matchedBooking =
    lookupAttempted && normalizedQuery
      ? bookings.find((b) => b.bookingId.toUpperCase() === normalizedQuery) ??
        null
      : null;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelledResult(null);
    setErrorMsg(null);
    setLookupAttempted(true);
  };

  const handleExecuteCancel = () => {
    if (!matchedBooking) return;
    try {
      const cancelled = onConfirmCancel(matchedBooking.bookingId);
      setCancelledResult(cancelled);
      setBookingIdInput('');
      setLookupAttempted(false);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Cancellation failed.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">
          Cancel Ticket
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Look up a reservation by Booking ID to cancel the ticket and
          immediately release its assigned seat back into cabin inventory.
        </p>
      </div>

      {cancelledResult && (
        <div
          role="status"
          className="bg-[#18181B] border border-emerald-800/70 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">
                Ticket cancelled successfully
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Booking{' '}
                <span className="font-mono font-semibold text-zinc-200">
                  {cancelledResult.bookingId}
                </span>{' '}
                for {cancelledResult.passengerName} has been removed. Seat{' '}
                <span className="font-mono font-semibold text-emerald-400">
                  {cancelledResult.seatBooked}
                </span>{' '}
                is now available.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToSeats}
            className="px-3.5 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            View Cabin Map
          </button>
        </div>
      )}

      {/* Lookup Form */}
      <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
        <form
          onSubmit={handleLookup}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={bookingIdInput}
              onChange={(e) => {
                setBookingIdInput(e.target.value.toUpperCase());
                setLookupAttempted(false);
                setErrorMsg(null);
              }}
              placeholder="Enter Booking ID to cancel (e.g. AN20261125090001)"
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Locate Booking
          </button>
        </form>

        {errorMsg && (
          <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
        )}

        {lookupAttempted && !matchedBooking && normalizedQuery && (
          <p className="text-sm text-zinc-400">
            Booking{' '}
            <span className="font-mono font-semibold text-zinc-200">
              {normalizedQuery}
            </span>{' '}
            not found.
          </p>
        )}

        {/* Quick select from active bookings */}
        {bookings.length > 0 && !matchedBooking && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="text-xs font-medium text-zinc-400 mb-2.5">
              Or select an active reservation to cancel:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {bookings.slice(0, 6).map((b) => (
                <button
                  key={b.bookingId}
                  type="button"
                  onClick={() => {
                    setBookingIdInput(b.bookingId);
                    setLookupAttempted(true);
                    setCancelledResult(null);
                    setErrorMsg(null);
                  }}
                  className="text-left p-3 rounded-lg border border-zinc-800 bg-[#111114] hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
                >
                  <div className="font-mono text-xs font-semibold text-[#E50914] truncate">
                    {b.bookingId}
                  </div>
                  <div className="mt-1 text-xs font-medium text-zinc-200 truncate">
                    {b.passengerName} · Seat {b.seatBooked}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Matched Ticket & Explicit Confirmation */}
      {matchedBooking && (
        <div className="space-y-4">
          <TicketCard ticket={matchedBooking} compact />

          <div className="bg-[#18181B] border border-red-900/70 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Are you sure you want to cancel this ticket?
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  This permanently deletes booking{' '}
                  <span className="font-mono font-semibold text-zinc-200">
                    {matchedBooking.bookingId}
                  </span>{' '}
                  for {matchedBooking.passengerName} and releases seat{' '}
                  <span className="font-mono font-semibold text-zinc-200">
                    {matchedBooking.seatBooked}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setLookupAttempted(false);
                  setBookingIdInput('');
                }}
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={handleExecuteCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
