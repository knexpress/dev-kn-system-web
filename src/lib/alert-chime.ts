let primed: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!primed || primed.state === 'closed') {
    primed = new Ctx();
  }
  return primed;
}

/** Unlock Web Audio after the first click/tap so later alerts can play. */
export function primeAlertChime() {
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
}

/** Three-note chime synthesised with Web Audio, so no sound asset is needed. */
export function playAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = audioContext();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    [880, 1174.66, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // Audio blocked until the user interacts with the page
  }
}

export const playQuotationChime = playAlertChime;
