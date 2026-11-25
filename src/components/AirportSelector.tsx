import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { AIRPORTS } from '../data/airlines';
import { AirportInfo } from '../types/flighthub';

interface AirportSelectorProps {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
}

const REGIONS: Array<'All' | AirportInfo['region']> = [
  'All',
  'India',
  'Asia-Pacific',
  'Middle East',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Oceania',
];

export function AirportSelector({
  id,
  label,
  value,
  onChange,
  excludeCode,
}: AirportSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'All' | AirportInfo['region']>(
    'All'
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedAirport: AirportInfo | undefined = useMemo(
    () => AIRPORTS.find((a) => a.code === value.toUpperCase()),
    [value]
  );

  const filteredAirports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return AIRPORTS.filter((a) => {
      if (excludeCode && a.code === excludeCode.toUpperCase()) return false;
      if (regionFilter !== 'All' && a.region !== regionFilter) return false;
      if (!q) return true;
      return (
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
      );
    });
  }, [search, excludeCode, regionFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setSearch('');
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-zinc-300 mb-1.5"
      >
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-3.5 py-2.5 text-left bg-[#111114] border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#E50914]/25 focus:border-[#E50914]"
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-white shrink-0">
            {selectedAirport ? selectedAirport.code : value || '---'}
          </span>
          <span className="text-xs text-zinc-400 truncate">
            {selectedAirport
              ? `${selectedAirport.city}, ${selectedAirport.country}`
              : 'Select airport'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full min-w-[300px] sm:min-w-[360px] bg-[#18181B] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2.5 border-b border-zinc-800 bg-[#111114] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${AIRPORTS.length} airports by code, city, country...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#18181B] border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E50914]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {REGIONS.map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setRegionFilter(reg)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    regionFilter === reg
                      ? 'bg-[#E50914] text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60">
            {filteredAirports.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-500">
                No matching airports found.
              </div>
            ) : (
              filteredAirports.map((airport) => {
                const isSelected = airport.code === value.toUpperCase();
                return (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => {
                      onChange(airport.code);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-start justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-[#E50914]/15' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {airport.code}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {airport.city}, {airport.country}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{airport.name}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 whitespace-nowrap shrink-0 pt-0.5">
                      {airport.timezone}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
