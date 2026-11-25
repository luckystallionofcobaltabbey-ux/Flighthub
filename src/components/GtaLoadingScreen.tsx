import { useEffect, useState } from 'react';
import { Loader2, Plane } from 'lucide-react';

interface GtaLoadingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    src: '/src/assets/images/gta_flighthub_tarmac_1795633890408.jpg',
    alt: 'Commercial jet parked on a rain-slicked international tarmac at dusk',
    caption: 'Terminal Dispatch · Runway Clearance',
    tip: 'Window seats (A, F) and Aisle seats (C, D) are automatically allocated from Row 1 forward.',
  },
  {
    src: '/src/assets/images/gta_flighthub_cockpit_1795633891331.jpg',
    alt: 'Night flight deck overlooking glowing city skyline from cruising altitude',
    caption: 'Night Flight Deck · Cruise Altitude',
    tip: 'All 6 FlightHub Lmtd carriers operate on fixed 3-hour departure windows every day.',
  },
  {
    src: '/src/assets/images/gta_flighthub_lounge_1795633891608.jpg',
    alt: 'Modern dark airport departure lounge overlooking illuminated aircraft gates',
    caption: 'Executive Concourse · Gate B42',
    tip: 'Multiple tickets under the same passenger name can be narrowed down using the last 4 digits of the Booking ID.',
  },
];

export function GtaLoadingScreen({ onComplete }: GtaLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    const totalDuration = 4200; // 4.2s cinematic GTA V sequence

    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setProgress(pct);

      const nextSlide = Math.min(
        SLIDES.length - 1,
        Math.floor((elapsed / totalDuration) * SLIDES.length)
      );
      setSlideIndex(nextSlide);

      if (elapsed < totalDuration) {
        rafId = requestAnimationFrame(tick);
      } else {
        setFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 420);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  const currentSlide = SLIDES[slideIndex];

  const loadingStage =
    progress < 34
      ? 'Initializing 180-seat cabin manifest'
      : progress < 68
        ? 'Syncing carrier fares & flight windows'
        : progress < 95
          ? 'Preparing FlightHub Lmtd terminal'
          : 'Cleared for boarding';

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0A0A0C] text-white overflow-hidden transition-opacity duration-400 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Loading FlightHub Lmtd"
    >
      {/* Background Slideshow with GTA V Ken Burns Parallax */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#190406] via-[#0B0B0D] to-[#11131A]">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === slideIndex;
          return (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover ${
                  isActive ? 'animate-gta-pan' : ''
                }`}
              />
            </div>
          );
        })}

        {/* Cinematic Dark Scrim & Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/60" />
      </div>

      {/* Foreground GTA V HUD Layer */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top Row: Brand Emblem + Skip */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center shadow-lg shadow-black/50">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <div
                  style={{ fontFamily: 'var(--font-brand)' }}
                  className="text-3xl sm:text-4xl tracking-wider leading-none text-white"
                >
                  FLIGHTHUB <span className="text-[#E50914]">LMTD</span>
                </div>
                <div className="text-xs text-zinc-300 mt-1">
                  Aviation Reservation & Cabin Dispatch
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFadingOut(true);
              setTimeout(onComplete, 200);
            }}
            className="px-4 py-2 text-xs font-semibold text-zinc-200 bg-black/60 hover:bg-[#E50914] hover:text-white border border-white/20 hover:border-[#E50914] rounded-md transition-colors whitespace-nowrap shrink-0 backdrop-blur-xs"
          >
            Enter Terminal
          </button>
        </div>

        {/* Bottom Row: GTA V Tip Left + Loading Ring & Progress Right */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <div className="text-xs font-mono text-[#E50914] font-semibold tracking-wide">
              {currentSlide.caption}
            </div>
            <p className="text-base sm:text-lg font-medium text-zinc-100 leading-snug">
              {currentSlide.tip}
            </p>
          </div>

          <div className="w-full md:w-80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 text-zinc-200 font-medium">
                <Loader2 className="w-4 h-4 text-[#E50914] animate-spin shrink-0" />
                <span>{loadingStage}</span>
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {progress}%
              </span>
            </div>

            <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E50914] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
