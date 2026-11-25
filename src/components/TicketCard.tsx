import { useState } from 'react';
import { Check, Copy, CreditCard, Plane, Trash2 } from 'lucide-react';
import { BookingRecord } from '../types/flighthub';
import {
  formatDisplayDateTime,
  formatDurationMinutes,
} from '../utils/flightEngine';

interface TicketCardProps {
  ticket: BookingRecord;
  onRequestCancel?: (bookingId: string) => void;
  compact?: boolean;
}

export function TicketCard({
  ticket,
  onRequestCancel,
  compact = false,
}: TicketCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(ticket.bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  const statusTone =
    ticket.preferenceStatus === 'Preferred seat assigned'
      ? 'text-emerald-400'
      : ticket.preferenceStatus ===
          'Preferred seat unavailable; alternative seat assigned'
        ? 'text-amber-400'
        : 'text-zinc-400';

  const durationLabel = ticket.durationMinutes
    ? formatDurationMinutes(ticket.durationMinutes)
    : '3h 00m';

  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header strip */}
      <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-[#1F1F23]">
        <div>
          <div className="text-xs font-medium text-zinc-400">
            FlightHub Lmtd · {ticket.airline} · {ticket.airlineCode}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white tabular-nums">
              {ticket.bookingId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800 whitespace-nowrap shrink-0"
              title="Copy Booking ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-zinc-400">Fare</div>
            <div className="font-mono text-base font-semibold text-white tabular-nums">
              Rs.{ticket.fare.toLocaleString('en-IN')}
            </div>
          </div>

          {onRequestCancel && (
            <button
              type="button"
              onClick={() => onRequestCancel(ticket.bookingId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 border border-red-900/70 bg-red-950/30 hover:bg-[#E50914] hover:text-white hover:border-[#E50914] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Route Banner */}
      <div className="px-6 py-5 border-b border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <div className="text-xs text-zinc-400">Departure (Local)</div>
          <div className="font-display text-2xl font-bold text-white tracking-tight font-mono">
            {ticket.departureAirport}
          </div>
          <div className="mt-0.5 font-mono text-xs text-zinc-300 tabular-nums">
            {formatDisplayDateTime(
              ticket.departureDateTime,
              ticket.departureTzLabel
            )}
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-center justify-center text-zinc-500">
          <div className="flex items-center gap-2 w-full sm:max-w-[180px]">
            <div className="h-px flex-1 bg-zinc-700" />
            <Plane className="w-4 h-4 text-[#E50914] shrink-0" />
            <div className="h-px flex-1 bg-zinc-700" />
          </div>
          <span className="mt-1 text-xs text-zinc-400 font-mono tabular-nums">
            {durationLabel}
            {ticket.distanceKm
              ? ` · ${ticket.distanceKm.toLocaleString('en-IN')} km`
              : ''}
          </span>
        </div>

        <div className="sm:text-right">
          <div className="text-xs text-zinc-400">Arrival (Local)</div>
          <div className="font-display text-2xl font-bold text-white tracking-tight font-mono">
            {ticket.arrivalAirport}
          </div>
          <div className="mt-0.5 font-mono text-xs text-zinc-300 tabular-nums">
            {formatDisplayDateTime(
              ticket.arrivalDateTime,
              ticket.arrivalTzLabel
            )}
          </div>
        </div>
      </div>

      {/* Passenger & Seat Grid */}
      <div
        className={`px-6 ${compact ? 'py-4' : 'py-5'} grid grid-cols-2 sm:grid-cols-4 gap-6`}
      >
        <div>
          <div className="text-xs text-zinc-400">Passenger</div>
          <div className="mt-0.5 text-sm font-semibold text-white">
            {ticket.passengerName}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400">Citizenship</div>
          <div className="mt-0.5 text-sm font-medium text-zinc-200">
            {ticket.citizenship}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400">Seat Booked</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-[#E50914] tabular-nums">
            {ticket.seatBooked}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400">Seat Preference</div>
          <div className="mt-0.5 text-sm font-medium text-zinc-200">
            {ticket.seatPreference}
          </div>
          <div className={`mt-0.5 text-xs ${statusTone}`}>
            {ticket.preferenceStatus}
          </div>
        </div>
      </div>

      {/* Razorpay Payment Receipt Line */}
      {ticket.payment && (
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-[#141414]/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Paid via{' '}
              <span className="text-zinc-200 font-medium">
                {ticket.payment.gateway ?? 'Razorpay'} · {ticket.payment.method}
              </span>{' '}
              ({ticket.payment.accountMasked})
            </span>
          </span>
          <span className="font-mono text-zinc-300 tabular-nums">
            {ticket.payment.referenceId}
          </span>
        </div>
      )}
    </div>
  );
}
