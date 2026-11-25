import { useEffect, useRef, useState } from 'react';
import { Loader2, Plane } from 'lucide-react';

interface GtaLoadingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    src: '/src/assets/images/gta_flighthub_tarmac_1795633890408.jpg',
    alt: 'Commercial jet parked on a rain-slicked international tarmac at dusk',
    caption: 'Terminal Dispatch · Runway Clearance',
    tip: 'Fares adapt in real time across 18 partner carriers using route distance, Jet-A1 fuel burn, and jetstream wind direction.',
  },
  {
    src: '/src/assets/images/gta_flighthub_cockpit_1795633891331.jpg',
    alt: 'Night flight deck overlooking glowing city skyline from cruising altitude',
    caption: 'Night Flight Deck · Cruise Altitude',
    tip: 'FlightHub Lmtd connects 148 global airports with carrier-adjusted cruise speeds and exact local timezone arrival schedules.',
  },
  {
    src: '/src/assets/images/gta_flighthub_lounge_1795633891608.jpg',
    alt: 'Modern dark airport departure lounge overlooking illuminated aircraft gates',
    caption: 'Executive Concourse · Gate B42',
    tip: 'Window (A, F), Middle (B, E), and Aisle (C, D) seats are automatically assigned from Row 1 forward with instant fallback.',
  },
];

export function GtaLoadingScreen({ onComplete }: GtaLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const completedRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const triggerExit = (delayMs: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFadingOut(true);
    finishTimerRef.current = window.setTimeout(() => {
      onCompleteRef.current();
    }, delayMs);
  };

  useEffect(() => {
    completedRef.current = false;
    const startTime = performance.now();
    const totalDuration = 4000;

    let rafId = 0;
    const tick = (now: number) => {
      if (completedRef.current) return;
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
        triggerExit(350);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (finishTimerRef.current !== null) {
        clearTimeout(finishTimerRef.current);
      }
    };
  }, []);

  const currentSlide = SLIDES[slideIndex] ?? SLIDES[0];

  const loadingStage =
    progress < 34
      ? 'Initializing 180-seat cabin manifest'
      : progress < 68
        ? 'Syncing 18 carriers & 148 global hubs'
        : progress < 95
          ? 'Calculating distance & fuel tariffs'
          : 'Cleared for boarding';

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#070B14] text-white overflow-hidden transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Loading FlightHub Lmtd"
    >
      {/* Background Slideshow with GTA V Ken Burns Parallax */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#002247] via-[#070B14] to-[#3B0018]">
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

        {/* Blaugrana Scrim & Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/55 to-[#002855]/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/85 via-transparent to-[#4A001E]/45" />
      </div>

      {/* Foreground GTA V HUD Layer */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Top Row: Uploaded Isometric Blaugrana Brand Logo + Skip */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#004D98] border border-[#1E2E4E] iso-depth-sm overflow-hidden flex items-center justify-center shrink-0">
              {!logoError ? (
                <img
                  src="/assets/aistudio/App_icon_1x_caee1df7.png"
                  alt="FlightHub Lmtd isometric Blaugrana logo"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover scale-[1.22]"
                />
              ) : (
                <Plane className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div
                style={{ fontFamily: 'var(--font-brand)' }}
                className="text-3xl sm:text-4xl tracking-wider leading-none text-white"
              >
                FLIGHTHUB <span className="text-[#EDBB00]">LMTD</span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Isometric Aviation Dispatch · Blaugrana Edition
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerExit(180)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#004D98]/90 hover:bg-[#A50044] border border-[#1C6DD0]/50 hover:border-[#CF115D] rounded-md transition-colors whitespace-nowrap shrink-0 backdrop-blur-xs"
          >
            Enter Terminal
          </button>
        </div>

        {/* Bottom Row: GTA V Tip Left + Blaugrana Progress Right */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <div className="text-xs font-mono text-[#EDBB00] font-semibold tracking-wide">
              {currentSlide.caption}
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-100 leading-snug">
              {currentSlide.tip}
            </p>
          </div>

          <div className="w-full md:w-80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 text-slate-200 font-medium">
                <Loader2 className="w-4 h-4 text-[#EDBB00] animate-spin shrink-0" />
                <span>{loadingStage}</span>
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {progress}%
              </span>
            </div>

            <div className="h-2 w-full bg-[#0D1526] border border-[#1E2E4E] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#004D98] via-[#A50044] to-[#EDBB00] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
