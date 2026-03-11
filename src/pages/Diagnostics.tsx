import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, AlertTriangle, CheckCircle, XCircle, Smartphone, Wifi, Monitor, HardDrive, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DiagnosticResult {
  label: string;
  value: string;
  status: "ok" | "warning" | "error" | "info";
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "ok": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    case "error": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default: return <div className="h-4 w-4 shrink-0" />;
  }
};

export default function Diagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>>({});
  const [landingTestRunning, setLandingTestRunning] = useState(false);

  useEffect(() => {
    // Set up global error capture
    const errors: string[] = [];
    try {
      const existing = localStorage.getItem('pwa_error_log');
      if (existing) errors.push(...JSON.parse(existing));
    } catch {}

    const handleError = (event: ErrorEvent) => {
      const msg = `${event.message} at ${event.filename}:${event.lineno}`;
      errors.push(msg);
      try { localStorage.setItem('pwa_error_log', JSON.stringify(errors.slice(-10))); } catch {}
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = `Unhandled rejection: ${event.reason?.message || event.reason}`;
      errors.push(msg);
      try { localStorage.setItem('pwa_error_log', JSON.stringify(errors.slice(-10))); } catch {}
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    runDiagnostics();

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const runDiagnostics = async () => {
    const diag: DiagnosticResult[] = [];
    const raw: Record<string, any> = {};

    // Browser info
    const ua = navigator.userAgent;
    raw.userAgent = ua;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    raw.isIOS = isIOS;
    raw.isAndroid = isAndroid;

    let browser = "Unknown";
    if (ua.includes("CriOS")) browser = "Chrome (iOS)";
    else if (ua.includes("FxiOS")) browser = "Firefox (iOS)";
    else if (ua.includes("EdgiOS")) browser = "Edge (iOS)";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edge")) browser = "Edge";
    raw.browser = browser;

    diag.push({ label: "Browser", value: browser, status: "info" });
    diag.push({ label: "Platform", value: isIOS ? "iOS" : isAndroid ? "Android" : "Desktop", status: "info" });
    diag.push({ label: "User Agent", value: ua.substring(0, 100) + (ua.length > 100 ? "..." : ""), status: "info" });

    // PWA / Standalone
    const isIOSStandalone = (navigator as any).standalone === true;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isPWA = isIOSStandalone || isStandalone || isFullscreen;
    raw.isIOSStandalone = isIOSStandalone;
    raw.isStandalone = isStandalone;
    raw.isFullscreen = isFullscreen;
    raw.isPWA = isPWA;

    diag.push({ label: "Running as PWA", value: isPWA ? "Yes" : "No", status: isPWA ? "ok" : "info" });
    diag.push({ label: "Display Mode", value: isIOSStandalone ? "iOS Standalone" : isStandalone ? "Standalone" : isFullscreen ? "Fullscreen" : "Browser Tab", status: "info" });

    // Service Worker
    let swStatus = "Not supported";
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          swStatus = reg.active ? "Active" : reg.installing ? "Installing" : reg.waiting ? "Waiting" : "Registered (no active worker)";
          if (reg.active) {
            swStatus += ` (scope: ${reg.scope})`;
          }
        } else {
          swStatus = "Not registered";
        }
      } catch (e) {
        swStatus = `Error: ${(e as Error).message}`;
      }
    }
    raw.serviceWorkerStatus = swStatus;

    diag.push({
      label: "Service Worker",
      value: swStatus,
      status: swStatus.startsWith("Active") ? "ok" : swStatus === "Not registered" ? "warning" : swStatus.startsWith("Error") ? "error" : "info"
    });

    // Cache info
    let cacheNames: string[] = [];
    if ('caches' in window) {
      try {
        cacheNames = await caches.keys();
      } catch {
        cacheNames = [];
      }
    }
    raw.cacheNames = cacheNames;
    diag.push({ label: "Cache Storage", value: cacheNames.length > 0 ? cacheNames.join(", ") : "No caches", status: cacheNames.length > 0 ? "ok" : "warning" });

    // Screen / viewport
    raw.screenWidth = screen.width;
    raw.screenHeight = screen.height;
    raw.devicePixelRatio = window.devicePixelRatio;
    raw.viewportWidth = window.innerWidth;
    raw.viewportHeight = window.innerHeight;

    diag.push({ label: "Screen", value: `${screen.width}x${screen.height} @${window.devicePixelRatio}x`, status: "info" });
    diag.push({ label: "Viewport", value: `${window.innerWidth}x${window.innerHeight}`, status: "info" });

    // Network
    raw.online = navigator.onLine;
    const conn = (navigator as any).connection;
    raw.connectionType = conn?.effectiveType || "unknown";
    raw.downlink = conn?.downlink;

    diag.push({ label: "Online", value: navigator.onLine ? "Yes" : "No", status: navigator.onLine ? "ok" : "error" });
    if (conn) {
      diag.push({ label: "Connection", value: `${conn.effectiveType}${conn.downlink ? ` (${conn.downlink} Mbps)` : ''}`, status: conn.effectiveType === '4g' ? "ok" : "warning" });
    }

    // Storage
    raw.cookiesEnabled = navigator.cookieEnabled;
    let lsAvailable = false;
    try {
      localStorage.setItem('_diag_test', '1');
      localStorage.removeItem('_diag_test');
      lsAvailable = true;
    } catch {
      lsAvailable = false;
    }
    raw.localStorageAvailable = lsAvailable;

    diag.push({ label: "Cookies", value: navigator.cookieEnabled ? "Enabled" : "Disabled", status: navigator.cookieEnabled ? "ok" : "error" });
    diag.push({ label: "Local Storage", value: lsAvailable ? "Available" : "Blocked", status: lsAvailable ? "ok" : "error" });

    // PWA route persistence
    const pwaLastRoute = localStorage.getItem('pwa_last_route');
    const pwaLastScope = localStorage.getItem('pwa_last_scope');
    raw.pwaLastRoute = pwaLastRoute;
    raw.pwaLastScope = pwaLastScope;

    if (isPWA) {
      diag.push({ label: "PWA Last Route", value: pwaLastRoute || "Not set", status: pwaLastRoute ? "ok" : "warning" });
      diag.push({ label: "PWA Last Scope", value: pwaLastScope || "Not set", status: pwaLastScope ? "ok" : "warning" });
    }

    // Manifest check
    const manifestLink = document.querySelector('link[rel="manifest"]');
    raw.manifestFound = !!manifestLink;
    raw.manifestHref = (manifestLink as HTMLLinkElement)?.href || null;
    diag.push({ label: "Manifest", value: manifestLink ? "Found" : "Missing", status: manifestLink ? "ok" : "error" });

    // Safe area support
    const hasSafeArea = CSS.supports('padding-top: env(safe-area-inset-top)');
    raw.hasSafeAreaSupport = hasSafeArea;
    diag.push({ label: "Safe Area Support", value: hasSafeArea ? "Yes" : "No", status: "info" });

    // ===== LANDING PAGE SPECIFIC TESTS =====

    // 1. WebGL Support + Renderer Info
    let webglStatus = "Not supported";
    let webglRenderer = "Unknown";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null
        || canvas.getContext("webgl") as WebGLRenderingContext | null;
      if (gl) {
        webglStatus = gl instanceof WebGL2RenderingContext ? "WebGL2" : "WebGL1";
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
        }
        // Test shader compilation (same pattern as landing page)
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, 'attribute vec4 p;void main(){gl_Position=p;}');
        gl.compileShader(vs);
        const vsOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS);

        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, 'precision mediump float;void main(){gl_FragColor=vec4(1.0);}');
        gl.compileShader(fs);
        const fsOk = gl.getShaderParameter(fs, gl.COMPILE_STATUS);

        if (!vsOk || !fsOk) {
          webglStatus += " (shader compilation failed)";
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);
        
        // Lose context to free resources
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        loseCtx?.loseContext();
      }
    } catch (e) {
      webglStatus = `Error: ${(e as Error).message}`;
    }
    raw.webglStatus = webglStatus;
    raw.webglRenderer = webglRenderer;

    diag.push({ label: "WebGL", value: webglStatus, status: webglStatus.includes("Error") || webglStatus === "Not supported" ? "error" : webglStatus.includes("failed") ? "warning" : "ok" });
    diag.push({ label: "GPU Renderer", value: webglRenderer.substring(0, 80), status: "info" });

    // 2. Three.js Bundle Load Test
    let threeJsStatus = "Not tested";
    try {
      const startTime = performance.now();
      const three = await import('three');
      const loadTime = Math.round(performance.now() - startTime);
      
      // Try creating a renderer (the critical path for landing page)
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 64;
      testCanvas.height = 64;
      const renderer = new three.WebGLRenderer({ canvas: testCanvas, antialias: false, alpha: true });
      renderer.dispose();
      
      threeJsStatus = `OK (loaded in ${loadTime}ms)`;
    } catch (e) {
      threeJsStatus = `FAILED: ${(e as Error).message}`;
    }
    raw.threeJsStatus = threeJsStatus;
    diag.push({ label: "Three.js", value: threeJsStatus, status: threeJsStatus.startsWith("OK") ? "ok" : "error" });

    // 3. Performance Check Simulation
    let perfTier = "unknown";
    let perfReason = "not checked";
    try {
      // Check reduced motion
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (prefersReduced) {
        perfTier = "low";
        perfReason = "prefers-reduced-motion";
      } else {
        const memory = (navigator as any).deviceMemory;
        const cores = navigator.hardwareConcurrency;
        
        if (memory && memory <= 2) { perfTier = "low"; perfReason = `low-memory (${memory}GB)`; }
        else if (cores && cores <= 2) { perfTier = "low"; perfReason = `low-cpu (${cores} cores)`; }
        else if (memory && memory <= 4) { perfTier = "medium"; perfReason = `medium-memory (${memory}GB)`; }
        else if (cores && cores <= 4) { perfTier = "medium"; perfReason = `medium-cpu (${cores} cores)`; }
        else { perfTier = "high"; perfReason = `${cores || '?'} cores, ${memory || '?'}GB RAM`; }
        
        // Quick frame rate test
        const fps = await new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const count = () => {
            frames++;
            if (performance.now() - start < 200) requestAnimationFrame(count);
            else resolve(Math.round((frames / (performance.now() - start)) * 1000));
          };
          requestAnimationFrame(count);
        });
        
        raw.measuredFps = fps;
        if (fps < 25 && perfTier !== 'low') { perfTier = "low"; perfReason += ` + low-fps (${fps})`; }
        else if (fps < 45 && perfTier === 'high') { perfTier = "medium"; perfReason += ` + medium-fps (${fps})`; }
      }
    } catch (e) {
      perfReason = `Error: ${(e as Error).message}`;
    }
    raw.perfTier = perfTier;
    raw.perfReason = perfReason;

    diag.push({ label: "Performance Tier", value: `${perfTier} (${perfReason})`, status: perfTier === 'high' ? "ok" : perfTier === 'medium' ? "warning" : "error" });

    // 4. Cached Bundle Integrity
    let bundleStatus = "No caches";
    if (cacheNames.length > 0) {
      try {
        let jsFiles = 0;
        let totalSize = 0;
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          for (const req of keys) {
            if (req.url.endsWith('.js') || req.url.includes('.js?')) {
              jsFiles++;
              try {
                const resp = await cache.match(req);
                if (resp) {
                  const blob = await resp.clone().blob();
                  totalSize += blob.size;
                }
              } catch {}
            }
          }
        }
        bundleStatus = `${jsFiles} JS files cached (${(totalSize / 1024).toFixed(0)}KB)`;
      } catch (e) {
        bundleStatus = `Error checking: ${(e as Error).message}`;
      }
    }
    raw.bundleStatus = bundleStatus;
    diag.push({ label: "Cached JS Bundles", value: bundleStatus, status: bundleStatus.includes("Error") ? "error" : "info" });

    // 5. Stored Errors from previous sessions
    const storedErrors: string[] = [];
    try {
      const errLog = localStorage.getItem('pwa_error_log');
      if (errLog) storedErrors.push(...JSON.parse(errLog));
    } catch {}
    raw.storedErrors = storedErrors;

    // Also check for landing-specific errors
    let landingError = "";
    try {
      const le = localStorage.getItem('landing_crash_log');
      if (le) {
        const parsed = JSON.parse(le);
        landingError = parsed.message || le;
      }
    } catch {}
    raw.landingCrashLog = landingError;

    if (landingError) {
      diag.push({ label: "Landing Page Crash", value: landingError, status: "error" });
    }

    if (storedErrors.length > 0) {
      diag.push({ label: "Stored Errors", value: storedErrors.slice(0, 3).join("; "), status: "error" });
    }

    // 6. Static Mode Preference
    const staticMode = localStorage.getItem('landing-static-mode');
    raw.staticModeEnabled = staticMode === 'true';
    if (staticMode === 'true') {
      diag.push({ label: "Static Mode", value: "Enabled (user or auto)", status: "warning" });
    }

    setResults(diag);
    setRawData(raw);
  };

  const testLandingPage = () => {
    setLandingTestRunning(true);
    // Clear previous crash log before testing
    try { localStorage.removeItem('landing_crash_log'); } catch {}
    // Navigate to landing with diag flag - it will capture errors and redirect back
    window.location.href = '/?diag=1';
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name so staff can identify your report");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('visitor_diagnostics').insert({
        visitor_name: name.trim(),
        user_agent: rawData.userAgent,
        platform: rawData.isIOS ? 'iOS' : rawData.isAndroid ? 'Android' : 'Desktop',
        is_pwa: rawData.isPWA,
        is_standalone: rawData.isStandalone || rawData.isIOSStandalone,
        is_ios: rawData.isIOS,
        is_android: rawData.isAndroid,
        service_worker_status: rawData.serviceWorkerStatus,
        display_mode: rawData.isIOSStandalone ? 'ios-standalone' : rawData.isStandalone ? 'standalone' : rawData.isFullscreen ? 'fullscreen' : 'browser',
        screen_width: rawData.screenWidth,
        screen_height: rawData.screenHeight,
        device_pixel_ratio: rawData.devicePixelRatio,
        viewport_width: rawData.viewportWidth,
        viewport_height: rawData.viewportHeight,
        online: rawData.online,
        connection_type: rawData.connectionType,
        cookies_enabled: rawData.cookiesEnabled,
        local_storage_available: rawData.localStorageAvailable,
        pwa_last_route: rawData.pwaLastRoute,
        pwa_last_scope: rawData.pwaLastScope,
        cache_names: rawData.cacheNames || [],
        sw_version: rawData.swVersion || 'N/A',
        errors: rawData.storedErrors || [],
        raw_data: rawData,
      } as any);

      if (error) throw error;
      setSubmitted(true);
      toast.success("Diagnostics submitted to RISE staff");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit diagnostics");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    const text = results.map(r => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const clearErrorLogs = () => {
    try {
      localStorage.removeItem('pwa_error_log');
      localStorage.removeItem('landing_crash_log');
      toast.success("Error logs cleared");
      runDiagnostics();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-2xl mx-auto">
      <div className="space-y-6 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">RISE Diagnostics</h1>
          <p className="text-muted-foreground">
            This page checks your device and browser settings to help us troubleshoot any issues you're experiencing.
          </p>
        </div>

        {/* Device Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm font-medium">{rawData.isIOS ? 'iOS' : rawData.isAndroid ? 'Android' : 'Desktop'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Monitor className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">PWA Mode</p>
                <p className="text-sm font-medium">{rawData.isPWA ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Wifi className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Connection</p>
                <p className="text-sm font-medium">{rawData.connectionType || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Perf Tier</p>
                <p className={`text-sm font-medium ${rawData.perfTier === 'high' ? 'text-green-500' : rawData.perfTier === 'medium' ? 'text-yellow-500' : rawData.perfTier === 'low' ? 'text-red-500' : ''}`}>
                  {rawData.perfTier || 'Checking...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Landing Page Test */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-4 w-4" />
              Landing Page Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Press the button below to test the landing page. It will attempt to load all landing page components (3D player, animations, WebGL) and capture any errors that occur.
            </p>
            <div className="flex gap-2">
              <Button onClick={testLandingPage} disabled={landingTestRunning}>
                {landingTestRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</> : "Test Landing Page"}
              </Button>
              <Button variant="outline" onClick={clearErrorLogs}>
                Clear Error Logs
              </Button>
            </div>
            {rawData.landingCrashLog && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Landing Page Crash Detected
                </p>
                <p className="text-xs text-destructive/80 mt-1 break-all">{rawData.landingCrashLog}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Detailed Results</CardTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <StatusIcon status={result.status} />
                  <span className="text-sm font-medium min-w-[120px] shrink-0">{result.label}</span>
                  <span className="text-sm text-muted-foreground break-all">{result.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit to staff */}
        <Card>
          <CardContent className="pt-6">
            {submitted ? (
              <div className="flex items-center gap-3 justify-center py-4">
                <Check className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium">Diagnostics sent to RISE staff. Thank you!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter your name and submit so RISE staff can review your diagnostics.
                </p>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Send to RISE Staff"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
