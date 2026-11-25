import { useMemo, useState } from 'react';
import { Search, Ticket } from 'lucide-react';
import { BookingRecord } from '../types/flighthub';
import { formatDisplayDateTime } from '../utils/flightEngine';
import { TicketCard } from './TicketCard';

interface ViewTicketsViewProps {
  bookings: BookingRecord[];
  onRequestCancel: (bookingId: string) => void;
  onGoToBook: () => void;
  onLoadSampleData: () => void;
  onSearchLogged?: (info: {
    mode: SearchMode;
    term: string;
    matchCount: number;
  }) => void;
}

type SearchMode = 'bookingId' | 'passengerName';

export function ViewTicketsView({
  bookings,
  onRequestCancel,
  onGoToBook,
  onLoadSampleData,
  onSearchLogged,
}: ViewTicketsViewProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('bookingId');
  const [query, setQuery] = useState('');
  const [lastFourFilter, setLastFourFilter] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState<{
    mode: SearchMode;
    term: string;
  } | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const searchMatches = useMemo(() => {
    if (!submittedSearch || !submittedSearch.term.trim()) return [];
    const term = submittedSearch.term.trim();

    if (submittedSearch.mode === 'bookingId') {
      const upper = term.toUpperCase();
      return bookings.filter((b) => b.bookingId.toUpperCase() === upper);
    }

    const lower = term.toLowerCase();
    return bookings.filter((b) => b.passengerName.toLowerCase() === lower);
  }, [bookings, submittedSearch]);

  const disambiguatedMatches = useMemo(() => {
    if (
      submittedSearch?.mode === 'passengerName' &&
      searchMatches.length > 1 &&
      lastFourFilter.trim()
    ) {
      const suffix = lastFourFilter.trim().toUpperCase();
      return searchMatches.filter(
        (b) => b.bookingId.slice(-4).toUpperCase() === suffix
      );
    }
    return searchMatches;
  }, [submittedSearch, searchMatches, lastFourFilter]);

  const activeTicket = useMemo(() => {
    if (selectedTicketId) {
      const found = bookings.find((b) => b.bookingId === selectedTicketId);
      if (found) return found;
    }
    if (disambiguatedMatches.length === 1) {
      return disambiguatedMatches[0];
    }
    return null;
  }, [selectedTicketId, bookings, disambiguatedMatches]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedTicketId(null);
    setLastFourFilter('');
    setSubmittedSearch({ mode: searchMode, term: query });

    const trimmed = query.trim();
    if (trimmed && onSearchLogged) {
      const matchCount =
        searchMode === 'bookingId'
          ? bookings.filter(
              (b) => b.bookingId.toUpperCase() === trimmed.toUpperCase()
            ).length
          : bookings.filter(
              (b) => b.passengerName.toLowerCase() === trimmed.toLowerCase()
            ).length;
      onSearchLogged({ mode: searchMode, term: trimmed, matchCount });
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setLastFourFilter('');
    setSubmittedSearch(null);
    setSelectedTicketId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            View & Lookup Tickets
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Search reservations by Booking ID or Passenger Name, or select any
            issued ticket from the ledger below.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 tabular-nums">
          {bookings.length} active{' '}
          {bookings.length === 1 ? 'reservation' : 'reservations'}
        </div>
      </div>

      {/* Search Panel */}
      <section className="bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#0A1120] rounded-lg border border-[#1E2E4E]">
            <button
              type="button"
              onClick={() => {
                setSearchMode('bookingId');
                setSubmittedSearch(null);
                setLastFourFilter('');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                searchMode === 'bookingId'
                  ? 'bg-[#004D98] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Search by Booking ID
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode('passengerName');
                setSubmittedSearch(null);
                setLastFourFilter('');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                searchMode === 'passengerName'
                  ? 'bg-[#004D98] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Search by Passenger Name
            </button>
          </div>

          {submittedSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-4"
            >
              Clear search
            </button>
          )}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchMode === 'bookingId'
                  ? 'Enter Booking ID (e.g. BC20261125090001)'
                  : 'Enter exact passenger name (e.g. Aarav Mehta)'
              }
              className={`w-full pl-10 pr-4 py-2.5 text-sm bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0] ${
                searchMode === 'bookingId' ? 'font-mono uppercase' : ''
              }`}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Find Ticket
          </button>
        </form>

        {/* Search Results / Disambiguation */}
        {submittedSearch && (
          <div className="pt-4 border-t border-[#1E2E4E]">
            {searchMatches.length === 0 ? (
              <p className="text-sm text-slate-400">
                {submittedSearch.mode === 'bookingId'
                  ? 'Booking not found.'
                  : 'No ticket found for that passenger.'}
              </p>
            ) : submittedSearch.mode === 'passengerName' &&
              searchMatches.length > 1 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Multiple tickets found for "{submittedSearch.term}"
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enter the last 4 digits of the Booking ID or click a
                      ticket row to view details.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="last-four-input"
                      className="text-xs font-medium text-slate-400 whitespace-nowrap"
                    >
                      Last 4 digits:
                    </label>
                    <input
                      id="last-four-input"
                      type="text"
                      maxLength={4}
                      value={lastFourFilter}
                      onChange={(e) => {
                        setLastFourFilter(e.target.value);
                        setSelectedTicketId(null);
                      }}
                      placeholder="e.g. 0001"
                      className="w-24 px-2.5 py-1.5 text-xs font-mono uppercase bg-[#0A1120] border border-[#1E2E4E] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
                    />
                  </div>
                </div>

                {disambiguatedMatches.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No ticket found with that name and last 4 Booking ID digits.
                  </p>
                ) : (
                  <div className="divide-y divide-[#1E2E4E] border border-[#1E2E4E] rounded-lg overflow-hidden bg-[#0A1120]">
                    {disambiguatedMatches.map((t) => (
                      <button
                        key={t.bookingId}
                        type="button"
                        onClick={() => setSelectedTicketId(t.bookingId)}
                        className="w-full px-4 py-3 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-[#121D33] transition-colors"
                      >
                        <div className="font-mono text-xs font-semibold text-[#EDBB00] tabular-nums">
                          {t.bookingId}
                        </div>
                        <div className="text-xs text-slate-200">
                          {t.airline} · {t.departureAirport} →{' '}
                          {t.arrivalAirport}
                        </div>
                        <div className="font-mono text-xs text-slate-400 tabular-nums">
                          {formatDisplayDateTime(t.departureDateTime)} · Seat{' '}
                          {t.seatBooked}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Active Ticket Detail */}
      {activeTicket && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">
              Ticket Details
            </h2>
            {selectedTicketId && (
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="text-xs font-medium text-slate-400 hover:text-white"
              >
                Close detail
              </button>
            )}
          </div>
          <TicketCard
            ticket={activeTicket}
            onRequestCancel={onRequestCancel}
          />
        </div>
      )}

      {/* All Issued Tickets Ledger */}
      <section className="bg-[#0D1526] border border-[#1E2E4E] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E2E4E] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              All Issued Tickets
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any reservation row to inspect the full boarding pass,
              fuel/distance breakdown, and payment receipt.
            </p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <Ticket className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-white">
                No tickets have been booked yet
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                Issued reservations will appear here with Booking IDs, seat
                assignments, payment receipts, and flight schedules.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onGoToBook}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#A50044] hover:bg-[#BE0A54] rounded-lg transition-colors whitespace-nowrap"
              >
                Book First Ticket
              </button>
              <button
                type="button"
                onClick={onLoadSampleData}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#0A1120] border border-[#1E2E4E] hover:bg-[#121D33] rounded-lg transition-colors whitespace-nowrap"
              >
                Load Sample Reservations
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2E4E] bg-[#121D33] text-xs font-semibold text-slate-300">
                  <th className="py-3 px-5">Booking ID</th>
                  <th className="py-3 px-5">Passenger</th>
                  <th className="py-3 px-5">Route</th>
                  <th className="py-3 px-5">Airline</th>
                  <th className="py-3 px-5">Departure</th>
                  <th className="py-3 px-5">Seat</th>
                  <th className="py-3 px-5 text-right">Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E4E]/80 text-sm">
                {bookings.map((b) => {
                  const isActive = activeTicket?.bookingId === b.bookingId;
                  return (
                    <tr
                      key={b.bookingId}
                      onClick={() => setSelectedTicketId(b.bookingId)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-[#004D98]/25' : 'hover:bg-[#121D33]/70'
                      }`}
                    >
                      <td className="py-3 px-5 font-mono text-xs font-semibold text-[#EDBB00] tabular-nums">
                        {b.bookingId}
                      </td>
                      <td className="py-3 px-5 font-medium text-white">
                        {b.passengerName}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs text-slate-300">
                        {b.departureAirport} → {b.arrivalAirport}
                      </td>
                      <td className="py-3 px-5 text-slate-300">{b.airline}</td>
                      <td className="py-3 px-5 font-mono text-xs text-slate-400 tabular-nums">
                        {formatDisplayDateTime(b.departureDateTime)}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs font-semibold text-[#60A5FA] tabular-nums">
                        {b.seatBooked}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-xs font-semibold text-white tabular-nums">
                        Rs.{b.fare.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
