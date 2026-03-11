import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, AlertTriangle, CheckCircle, XCircle, Smartphone, Wifi, Monitor, HardDrive } from "lucide-react";
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

  useEffect(() => {
    runDiagnostics();
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
    let swVersion = "N/A";
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
    raw.swVersion = swVersion;

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

    // Errors from console (check localStorage for any stored errors)
    const storedErrors: string[] = [];
    try {
      const errLog = localStorage.getItem('pwa_error_log');
      if (errLog) storedErrors.push(...JSON.parse(errLog));
    } catch {}
    raw.storedErrors = storedErrors;

    if (storedErrors.length > 0) {
      diag.push({ label: "Stored Errors", value: storedErrors.slice(0, 3).join("; "), status: "error" });
    }

    // Safe area support
    const hasSafeArea = CSS.supports('padding-top: env(safe-area-inset-top)');
    raw.hasSafeAreaSupport = hasSafeArea;
    diag.push({ label: "Safe Area Support", value: hasSafeArea ? "Yes" : "No", status: "info" });

    setResults(diag);
    setRawData(raw);
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
        sw_version: rawData.swVersion,
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
                <p className="text-xs text-muted-foreground">Caches</p>
                <p className="text-sm font-medium">{rawData.cacheNames?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
