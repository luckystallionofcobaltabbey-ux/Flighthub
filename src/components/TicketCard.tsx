import { useState } from 'react';
import { Check, Copy, CreditCard, Fuel, Plane, Trash2 } from 'lucide-react';
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
        ? 'text-[#EDBB00]'
        : 'text-slate-400';

  const durationLabel = ticket.durationMinutes
    ? formatDurationMinutes(ticket.durationMinutes)
    : '3h 00m';

  return (
    <div className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl overflow-hidden">
      {/* Header strip */}
      <div className="px-6 py-4 border-b border-[#1E2E4E] flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#004D98]/35 via-[#121D33] to-[#A50044]/30">
        <div>
          <div className="text-xs font-medium text-slate-300">
            FlightHub Lmtd · {ticket.airline} · {ticket.airlineCode}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white tabular-nums">
              {ticket.bookingId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#1E2E4E]/60 whitespace-nowrap shrink-0"
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
            <div className="text-xs text-slate-300">Total Fare</div>
            <div className="font-mono text-base font-semibold text-[#EDBB00] tabular-nums">
              Rs.{ticket.fare.toLocaleString('en-IN')}
            </div>
          </div>

          {onRequestCancel && (
            <button
              type="button"
              onClick={() => onRequestCancel(ticket.bookingId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white border border-[#A50044] bg-[#A50044]/40 hover:bg-[#A50044] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Route Banner */}
      <div className="px-6 py-5 border-b border-[#1E2E4E]/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <div className="text-xs text-slate-400">Departure (Local)</div>
          <div className="font-display text-2xl font-bold text-white tracking-tight font-mono">
            {ticket.departureAirport}
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-300 tabular-nums">
            {formatDisplayDateTime(
              ticket.departureDateTime,
              ticket.departureTzLabel
            )}
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-center justify-center text-slate-400">
          <div className="flex items-center gap-2 w-full sm:max-w-[180px]">
            <div className="h-px flex-1 bg-[#1E2E4E]" />
            <Plane className="w-4 h-4 text-[#EDBB00] shrink-0" />
            <div className="h-px flex-1 bg-[#1E2E4E]" />
          </div>
          <span className="mt-1 text-xs text-slate-300 font-mono tabular-nums">
            {durationLabel}
            {ticket.distanceKm
              ? ` · ${ticket.distanceKm.toLocaleString('en-IN')} km`
              : ''}
          </span>
        </div>

        <div className="sm:text-right">
          <div className="text-xs text-slate-400">Arrival (Local)</div>
          <div className="font-display text-2xl font-bold text-white tracking-tight font-mono">
            {ticket.arrivalAirport}
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-300 tabular-nums">
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
          <div className="text-xs text-slate-400">Passenger</div>
          <div className="mt-0.5 text-sm font-semibold text-white">
            {ticket.passengerName}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Citizenship</div>
          <div className="mt-0.5 text-sm font-medium text-slate-200">
            {ticket.citizenship}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Seat Booked</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-[#60A5FA] tabular-nums">
            {ticket.seatBooked}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Seat Preference</div>
          <div className="mt-0.5 text-sm font-medium text-slate-200">
            {ticket.seatPreference}
          </div>
          <div className={`mt-0.5 text-xs ${statusTone}`}>
            {ticket.preferenceStatus}
          </div>
        </div>
      </div>

      {/* Fare Breakdown Line */}
      {ticket.fareBreakdown && !compact && (
        <div className="px-6 py-2.5 border-t border-[#1E2E4E]/70 bg-[#0A1120] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
            <span>
              Base Rs.{ticket.fareBreakdown.baseFare.toLocaleString('en-IN')} ·
              Distance Rs.
              {ticket.fareBreakdown.distanceCharge.toLocaleString('en-IN')} ·
              Fuel Rs.
              {ticket.fareBreakdown.fuelSurcharge.toLocaleString('en-IN')} · Taxes
              Rs.{ticket.fareBreakdown.airportTaxes.toLocaleString('en-IN')}
            </span>
          </span>
          <span>
            Est. Jet-A1: {ticket.fareBreakdown.estimatedFuelLitres.toLocaleString('en-IN')} L
          </span>
        </div>
      )}

      {/* Razorpay Payment Receipt Line */}
      {ticket.payment && (
        <div className="px-6 py-3 border-t border-[#1E2E4E]/80 bg-[#070B14]/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Paid via{' '}
              <span className="text-slate-200 font-medium">
                {ticket.payment.gateway ?? 'Razorpay'} · {ticket.payment.method}
              </span>{' '}
              ({ticket.payment.accountMasked})
            </span>
          </span>
          <span className="font-mono text-slate-300 tabular-nums">
            {ticket.payment.referenceId}
          </span>
        </div>
      )}
    </div>
  );
}
