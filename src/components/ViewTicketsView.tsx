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
          <p className="mt-1 text-sm text-zinc-400">
            Search reservations by Booking ID or Passenger Name, or select any
            issued ticket from the ledger below.
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-400 tabular-nums">
          {bookings.length} active{' '}
          {bookings.length === 1 ? 'reservation' : 'reservations'}
        </div>
      </div>

      {/* Search Panel */}
      <section className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#111114] rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setSearchMode('bookingId');
                setSubmittedSearch(null);
                setLastFourFilter('');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                searchMode === 'bookingId'
                  ? 'bg-[#E50914] text-white'
                  : 'text-zinc-400 hover:text-white'
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
                  ? 'bg-[#E50914] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Search by Passenger Name
            </button>
          </div>

          {submittedSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs font-medium text-zinc-400 hover:text-white underline underline-offset-4"
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
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchMode === 'bookingId'
                  ? 'Enter Booking ID (e.g. AN20261125090001)'
                  : 'Enter exact passenger name (e.g. Aarav Mehta)'
              }
              className={`w-full pl-10 pr-4 py-2.5 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914] ${
                searchMode === 'bookingId' ? 'font-mono uppercase' : ''
              }`}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Find Ticket
          </button>
        </form>

        {/* Search Results / Disambiguation */}
        {submittedSearch && (
          <div className="pt-4 border-t border-zinc-800">
            {searchMatches.length === 0 ? (
              <p className="text-sm text-zinc-400">
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
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Enter the last 4 digits of the Booking ID or click a
                      ticket row to view details.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="last-four-input"
                      className="text-xs font-medium text-zinc-400 whitespace-nowrap"
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
                      className="w-24 px-2.5 py-1.5 text-xs font-mono uppercase bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
                    />
                  </div>
                </div>

                {disambiguatedMatches.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    No ticket found with that name and last 4 Booking ID digits.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden bg-[#111114]">
                    {disambiguatedMatches.map((t) => (
                      <button
                        key={t.bookingId}
                        type="button"
                        onClick={() => setSelectedTicketId(t.bookingId)}
                        className="w-full px-4 py-3 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-900 transition-colors"
                      >
                        <div className="font-mono text-xs font-semibold text-[#E50914] tabular-nums">
                          {t.bookingId}
                        </div>
                        <div className="text-xs text-zinc-200">
                          {t.airline} · {t.departureAirport} →{' '}
                          {t.arrivalAirport}
                        </div>
                        <div className="font-mono text-xs text-zinc-400 tabular-nums">
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
                className="text-xs font-medium text-zinc-400 hover:text-white"
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
      <section className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              All Issued Tickets
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click any reservation row to inspect the full boarding pass and
              payment receipt.
            </p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <Ticket className="w-8 h-8 text-zinc-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-white">
                No tickets have been booked yet
              </p>
              <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                Issued reservations will appear here with Booking IDs, seat
                assignments, payment receipts, and flight schedules.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onGoToBook}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors whitespace-nowrap"
              >
                Book First Ticket
              </button>
              <button
                type="button"
                onClick={onLoadSampleData}
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Load Sample Reservations
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#1F1F23] text-xs font-semibold text-zinc-400">
                  <th className="py-3 px-5">Booking ID</th>
                  <th className="py-3 px-5">Passenger</th>
                  <th className="py-3 px-5">Route</th>
                  <th className="py-3 px-5">Airline</th>
                  <th className="py-3 px-5">Departure</th>
                  <th className="py-3 px-5">Seat</th>
                  <th className="py-3 px-5 text-right">Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-sm">
                {bookings.map((b) => {
                  const isActive = activeTicket?.bookingId === b.bookingId;
                  return (
                    <tr
                      key={b.bookingId}
                      onClick={() => setSelectedTicketId(b.bookingId)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-[#E50914]/10' : 'hover:bg-zinc-900/70'
                      }`}
                    >
                      <td className="py-3 px-5 font-mono text-xs font-semibold text-[#E50914] tabular-nums">
                        {b.bookingId}
                      </td>
                      <td className="py-3 px-5 font-medium text-white">
                        {b.passengerName}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs text-zinc-300">
                        {b.departureAirport} → {b.arrivalAirport}
                      </td>
                      <td className="py-3 px-5 text-zinc-300">{b.airline}</td>
                      <td className="py-3 px-5 font-mono text-xs text-zinc-400 tabular-nums">
                        {formatDisplayDateTime(b.departureDateTime)}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs font-semibold text-white tabular-nums">
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
