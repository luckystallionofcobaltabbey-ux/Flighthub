const STORAGE_SOUND_KEY = 'flighthub_sound_enabled_v1';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function primeAudioContext(): void {
  if (!isSoundEnabled()) return;
  try {
    getAudioContext();
  } catch {
    // Ignore audio context restriction errors
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(STORAGE_SOUND_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabledPref(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SOUND_KEY, String(enabled));
  } catch {
    // Ignore storage access errors
  }
}

interface ToneStep {
  frequency: number;
  startOffsetSec: number;
  durationSec: number;
  gainPeak: number;
  type?: OscillatorType;
}

function scheduleSteps(ctx: AudioContext, steps: ToneStep[]): void {
  const baseTime = ctx.currentTime + 0.005;

  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(
      step.frequency,
      baseTime + step.startOffsetSec
    );

    const start = baseTime + step.startOffsetSec;
    const attackEnd = start + 0.012;
    const stop = start + step.durationSec;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(step.gainPeak, attackEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(stop + 0.015);
  }
}

function playToneSequence(steps: ToneStep[]): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          scheduleSteps(ctx, steps);
        })
        .catch(() => {});
    } else {
      scheduleSteps(ctx, steps);
    }
  } catch {
    // Silently ignore audio playback issues in restricted environments
  }
}

/**
 * Warm ascending 3-note aviation boarding chime (C5 -> G5 -> C6)
 * triggered upon confirming a booking.
 */
export function playBookingConfirmedSound(): void {
  playToneSequence([
    {
      frequency: 523.25, // C5
      startOffsetSec: 0,
      durationSec: 0.14,
      gainPeak: 0.055,
      type: 'sine',
    },
    {
      frequency: 783.99, // G5
      startOffsetSec: 0.085,
      durationSec: 0.16,
      gainPeak: 0.06,
      type: 'sine',
    },
    {
      frequency: 1046.5, // C6
      startOffsetSec: 0.175,
      durationSec: 0.26,
      gainPeak: 0.055,
      type: 'triangle',
    },
  ]);
}

/**
 * Crisp two-tone confirmation ping (E5 -> B5) when payment authorization succeeds.
 */
export function playPaymentAuthorizedSound(): void {
  playToneSequence([
    {
      frequency: 659.25, // E5
      startOffsetSec: 0,
      durationSec: 0.1,
      gainPeak: 0.045,
      type: 'sine',
    },
    {
      frequency: 987.77, // B5
      startOffsetSec: 0.07,
      durationSec: 0.15,
      gainPeak: 0.045,
      type: 'sine',
    },
  ]);
}

/**
 * Restrained descending two-tone release cue (G4 -> D4)
 * triggered upon cancelling a ticket or releasing cabin seats.
 */
export function playTicketCancelledSound(): void {
  playToneSequence([
    {
      frequency: 392.0, // G4
      startOffsetSec: 0,
      durationSec: 0.13,
      gainPeak: 0.055,
      type: 'triangle',
    },
    {
      frequency: 293.66, // D4
      startOffsetSec: 0.105,
      durationSec: 0.21,
      gainPeak: 0.05,
      type: 'sine',
    },
  ]);
}

/**
 * Subtle low double-pulse alert (A3 -> F3) for declined transactions.
 */
export function playPaymentDeclinedSound(): void {
  playToneSequence([
    {
      frequency: 220.0, // A3
      startOffsetSec: 0,
      durationSec: 0.1,
      gainPeak: 0.05,
      type: 'triangle',
    },
    {
      frequency: 174.61, // F3
      startOffsetSec: 0.1,
      durationSec: 0.16,
      gainPeak: 0.05,
      type: 'triangle',
    },
  ]);
}
