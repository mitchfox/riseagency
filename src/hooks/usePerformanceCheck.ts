import { useState, useEffect } from "react";

interface PerformanceResult {
  isLowPerformance: boolean;
  isChecking: boolean;
  reason?: string;
}

// Check for low-end device indicators
export function usePerformanceCheck(): PerformanceResult {
  const [result, setResult] = useState<PerformanceResult>({
    isLowPerformance: false,
    isChecking: true,
  });

  useEffect(() => {
    const checkPerformance = async () => {
      let isLowPerformance = false;
      let reason: string | undefined;

      // 1. Check if user prefers reduced motion
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
        isLowPerformance = true;
        reason = "prefers-reduced-motion";
      }

      // 2. Check device memory (if available) - low memory devices
      if (!isLowPerformance && (navigator as any).deviceMemory) {
        const memory = (navigator as any).deviceMemory;
        if (memory <= 2) {
          isLowPerformance = true;
          reason = `low-memory (${memory}GB)`;
        }
      }

      // 3. Check hardware concurrency (CPU cores)
      if (!isLowPerformance && navigator.hardwareConcurrency) {
        if (navigator.hardwareConcurrency <= 2) {
          isLowPerformance = true;
          reason = `low-cpu (${navigator.hardwareConcurrency} cores)`;
        }
      }

      // 4. Check for WebGL support - required for 3D effects
      if (!isLowPerformance) {
        try {
          const canvas = document.createElement("canvas");
          const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
          if (!gl) {
            isLowPerformance = true;
            reason = "no-webgl";
          }
        } catch {
          isLowPerformance = true;
          reason = "webgl-error";
        }
      }

      // 5. Check connection speed (if available)
      if (!isLowPerformance && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          isLowPerformance = true;
          reason = `slow-connection (${effectiveType})`;
        }
      }

      // 6. Simple frame rate test - if device can't hit basic threshold
      if (!isLowPerformance) {
        const frameRateResult = await testFrameRate();
        if (frameRateResult < 20) {
          isLowPerformance = true;
          reason = `low-framerate (${frameRateResult}fps)`;
        }
      }

      // Also check localStorage for user preference to use static mode
      const userPreference = localStorage.getItem("landing-static-mode");
      if (userPreference === "true") {
        isLowPerformance = true;
        reason = "user-preference";
      }

      setResult({
        isLowPerformance,
        isChecking: false,
        reason,
      });
    };

    checkPerformance();
  }, []);

  return result;
}

// Quick frame rate test (runs for ~200ms)
function testFrameRate(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const startTime = performance.now();
    const duration = 200; // ms

    const countFrame = () => {
      frames++;
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        requestAnimationFrame(countFrame);
      } else {
        const fps = (frames / elapsed) * 1000;
        resolve(Math.round(fps));
      }
    };

    requestAnimationFrame(countFrame);
  });
}

// Utility to manually enable/disable static mode
export function setStaticModePreference(enabled: boolean) {
  if (enabled) {
    localStorage.setItem("landing-static-mode", "true");
  } else {
    localStorage.removeItem("landing-static-mode");
  }
}
