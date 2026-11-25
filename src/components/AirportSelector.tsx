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
        className="block text-xs font-medium text-slate-300 mb-1.5"
      >
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-3.5 py-2.5 text-left bg-[#0A1120] border border-[#1E2E4E] hover:border-[#1C6DD0] rounded-lg transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#1C6DD0]/30 focus:border-[#1C6DD0]"
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-[#EDBB00] shrink-0">
            {selectedAirport ? selectedAirport.code : value || '---'}
          </span>
          <span className="text-xs text-slate-300 truncate">
            {selectedAirport
              ? `${selectedAirport.city}, ${selectedAirport.country}`
              : 'Select airport'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full min-w-[300px] sm:min-w-[360px] bg-[#0D1526] border border-[#1E2E4E] iso-depth-sm rounded-xl overflow-hidden">
          <div className="p-2.5 border-b border-[#1E2E4E] bg-[#0A1120] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${AIRPORTS.length} airports by code, city, country...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E2E4E] rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-[#1C6DD0]"
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
                      ? 'bg-[#004D98] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-[#121D33]'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-[#1E2E4E]/70">
            {filteredAirports.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
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
                      isSelected ? 'bg-[#A50044]/25' : 'hover:bg-[#121D33]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#EDBB00]">
                          {airport.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {airport.city}, {airport.country}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{airport.name}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap shrink-0 pt-0.5">
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
