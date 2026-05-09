## Problem

Backtest (and full scan) exits instantly with `0 detected`, marking every confirmed clip as missed. The AI is never actually called.

## Root cause

In `src/components/staff/coaching/AIPlayerDetection.tsx` the pause/unmount effect added in the last change is:

```ts
useEffect(() => {
  const persistAndStop = () => { if (scanning) pauseRef.current = true; };
  window.addEventListener('beforeunload', persistAndStop);
  document.addEventListener('visibilitychange', () => { ... });
  return () => {
    window.removeEventListener('beforeunload', persistAndStop);
    cancelledRef.current = true;   // ← runs on EVERY [scanning] change
  };
}, [scanning]);
```

Sequence on "Run Backtest":
1. `startScan()` sets `cancelledRef.current = false` then calls `setScanning(true)`.
2. React re-renders, the effect's cleanup runs because `scanning` changed, setting `cancelledRef.current = true`.
3. The loop's first `if (cancelledRef.current) break;` exits immediately.
4. `dedupedByWindow.length === 0` branch fires → all 33 confirmed clips logged as "missed".

## Fix

1. Move the cancellation flag out of an effect that depends on `scanning`. Run a one-time mount effect (`[]`) that only sets `cancelledRef.current = true` on true component unmount.
2. The `beforeunload` and `visibilitychange` listeners should set `pauseRef.current = true` only (graceful pause + checkpoint), never `cancelledRef`.
3. Read `scanning` inside those handlers via a ref (e.g. `scanningRef`) so the listeners stay stable and don't need `scanning` as a dep.
4. Re-verify by running a backtest; expect actual AI calls, progress >0%, and a non-zero detected count or genuine matches/missed split.

## Technical detail

```ts
const scanningRef = useRef(false);
useEffect(() => { scanningRef.current = scanning; }, [scanning]);

useEffect(() => {
  const persistAndStop = () => { if (scanningRef.current) pauseRef.current = true; };
  const onVisibility = () => { if (document.visibilityState === 'hidden') persistAndStop(); };
  window.addEventListener('beforeunload', persistAndStop);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('beforeunload', persistAndStop);
    document.removeEventListener('visibilitychange', onVisibility);
    cancelledRef.current = true; // only on real unmount now
  };
}, []); // ← mount-only
```

No other files need to change. Persisted scan-state, resume banner, and counts badges already work; the loop just needs to be allowed to run.