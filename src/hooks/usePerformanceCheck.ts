import { useState, useEffect } from "react";

export type PerformanceTier = 'high' | 'medium' | 'low';

interface PerformanceResult {
  isLowPerformance: boolean;
  isChecking: boolean;
  reason?: string;
  tier: PerformanceTier;
}

// Quick GPU benchmark using WebGL
async function testGPUTier(): Promise<'high' | 'medium' | 'low'> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    if (!gl) return 'low';

    // Check for performance-indicating extensions
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const rendererLower = renderer.toLowerCase();
      
      // Known low-end indicators
      if (rendererLower.includes('intel hd') || 
          rendererLower.includes('intel(r) hd') ||
          rendererLower.includes('mali-4') ||
          rendererLower.includes('adreno 3') ||
          rendererLower.includes('powervr')) {
        return 'low';
      }
      
      // Known high-end indicators
      if (rendererLower.includes('nvidia') ||
          rendererLower.includes('radeon rx') ||
          rendererLower.includes('radeon pro') ||
          rendererLower.includes('apple m1') ||
          rendererLower.includes('apple m2') ||
          rendererLower.includes('apple m3')) {
        return 'high';
      }
    }

    // Quick shader performance test
    const startTime = performance.now();
    
    // Create a simple shader and run it
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, 'attribute vec4 p;void main(){gl_Position=p;}');
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, 'precision mediump float;void main(){gl_FragColor=vec4(1.0);}');
    gl.compileShader(fs);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    
    // Draw a few times to measure
    for (let i = 0; i < 10; i++) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.finish();
    
    const elapsed = performance.now() - startTime;
    
    // Clean up
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    
    if (elapsed > 50) return 'low';
    if (elapsed > 20) return 'medium';
    return 'high';
  } catch {
    return 'medium';
  }
}

// Check for low-end device indicators
export function usePerformanceCheck(): PerformanceResult {
  const [result, setResult] = useState<PerformanceResult>({
    isLowPerformance: false,
    isChecking: true,
    tier: 'high',
  });

  useEffect(() => {
    const checkPerformance = async () => {
      let tier: PerformanceTier = 'high';
      let reason: string | undefined;

      // 1. Check if user prefers reduced motion - immediate low
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
        setResult({ isLowPerformance: true, isChecking: false, reason: "prefers-reduced-motion", tier: 'low' });
        return;
      }

      // 2. Check device memory - increased threshold to 4GB
      if ((navigator as any).deviceMemory) {
        const memory = (navigator as any).deviceMemory;
        if (memory <= 2) {
          tier = 'low';
          reason = `low-memory (${memory}GB)`;
        } else if (memory <= 4 && tier === 'high') {
          tier = 'medium';
          reason = reason || `medium-memory (${memory}GB)`;
        }
      }

      // 3. Check hardware concurrency - increased threshold to 4 cores
      if (navigator.hardwareConcurrency) {
        if (navigator.hardwareConcurrency <= 2) {
          tier = 'low';
          reason = `low-cpu (${navigator.hardwareConcurrency} cores)`;
        } else if (navigator.hardwareConcurrency <= 4 && tier !== 'low') {
          tier = 'medium';
          reason = reason || `medium-cpu (${navigator.hardwareConcurrency} cores)`;
        }
      }

      // 4. Check for WebGL support
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) {
          setResult({ isLowPerformance: true, isChecking: false, reason: "no-webgl", tier: 'low' });
          return;
        }
      } catch {
        setResult({ isLowPerformance: true, isChecking: false, reason: "webgl-error", tier: 'low' });
        return;
      }

      // 5. Check connection speed
      if ((navigator as any).connection) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          tier = 'low';
          reason = `slow-connection (${effectiveType})`;
        } else if (effectiveType === "3g" && tier !== 'low') {
          tier = 'medium';
          reason = reason || `medium-connection (${effectiveType})`;
        }
      }

      // 6. GPU tier detection
      if (tier !== 'low') {
        const gpuTier = await testGPUTier();
        if (gpuTier === 'low') {
          tier = 'low';
          reason = reason || 'low-gpu';
        } else if (gpuTier === 'medium') {
          tier = tier === 'high' ? 'medium' : tier;
          reason = reason || 'medium-gpu';
        }
      }

      // 7. Frame rate test with higher threshold (30fps)
      if (tier !== 'low') {
        const frameRateResult = await testFrameRate();
        if (frameRateResult < 25) {
          tier = 'low';
          reason = `low-framerate (${frameRateResult}fps)`;
        } else if (frameRateResult < 45 && tier === 'high') {
          tier = 'medium';
          reason = reason || `medium-framerate (${frameRateResult}fps)`;
        }
      }

      // 8. Check localStorage for user preference
      const userPreference = localStorage.getItem("landing-static-mode");
      if (userPreference === "true") {
        setResult({ isLowPerformance: true, isChecking: false, reason: "user-preference", tier: 'low' });
        return;
      }

      const isLowPerformance = tier === 'low';

      setResult({
        isLowPerformance,
        isChecking: false,
        reason,
        tier,
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
