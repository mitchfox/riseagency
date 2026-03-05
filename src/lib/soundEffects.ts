/**
 * Lightweight sound effects using Web Audio API.
 * No external files required — generates tones programmatically.
 * Includes optional haptic feedback for mobile.
 */

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

/** Trigger haptic vibration on supported devices */
const haptic = (pattern: number | number[]) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* not supported */ }
};

/** Short tick/pip sound for incremental progress */
export const playTick = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    haptic(10);
  } catch { /* silent fail */ }
};

/** Success chime — two rising tones */
export const playSuccess = () => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
    haptic([30, 50, 30]);
  } catch { /* silent fail */ }
};

/** Error buzz — low short tone */
export const playError = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 200;
    osc.type = "square";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    haptic([50, 30, 50]);
  } catch { /* silent fail */ }
};

/** Soft notification ping */
export const playNotification = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    haptic(15);
  } catch { /* silent fail */ }
};

/** Welcome chime — warm three-note ascending chord for portal login */
export const playWelcome = () => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.35);
    });
    haptic([20, 40, 20]);
  } catch { /* silent fail */ }
};
