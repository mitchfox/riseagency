import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Activity, Copy, ExternalLink, RefreshCw, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface DiagnosticReport {
  id: string;
  visitor_name: string | null;
  user_agent: string | null;
  platform: string | null;
  is_pwa: boolean;
  is_standalone: boolean;
  is_ios: boolean;
  is_android: boolean;
  service_worker_status: string | null;
  display_mode: string | null;
  screen_width: number | null;
  screen_height: number | null;
  device_pixel_ratio: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  online: boolean;
  connection_type: string | null;
  cookies_enabled: boolean;
  local_storage_available: boolean;
  pwa_last_route: string | null;
  pwa_last_scope: string | null;
  cache_names: string[] | null;
  sw_version: string | null;
  errors: string[] | null;
  raw_data: any;
  created_at: string;
}

const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
    {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </span>
);

export const VisitorDiagnostics = () => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visitor_diagnostics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports((data as any[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const copyDiagnosticsLink = () => {
    const url = `${window.location.origin}/diagnostics`;
    navigator.clipboard.writeText(url);
    toast.success("Diagnostics link copied. Send this to the visitor.");
  };

  const deleteReport = async (id: string) => {
    try {
      await supabase.from('visitor_diagnostics').delete().eq('id', id);
      setReports(prev => prev.filter(r => r.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
      toast.success("Report deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Visitor Diagnostics
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyDiagnosticsLink}>
            <Copy className="h-3 w-3 mr-1" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={loadReports} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/diagnostics" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Page
            </a>
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No diagnostic reports yet.</p>
            <p className="text-sm mt-1">Send the diagnostics link to a visitor to collect their device info.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedReport(report)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{report.visitor_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.platform} · {report.display_mode} · {format(new Date(report.created_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge ok={report.is_pwa} label="PWA" />
                    <StatusBadge ok={report.service_worker_status?.startsWith('Active') ?? false} label="SW" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Diagnostics: {selectedReport?.visitor_name || "Unknown"}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Summary badges */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge ok={selectedReport.is_pwa} label={selectedReport.is_pwa ? "PWA Active" : "Not PWA"} />
                  <StatusBadge ok={selectedReport.service_worker_status?.startsWith('Active') ?? false} label={selectedReport.service_worker_status?.startsWith('Active') ? "SW Active" : "SW Inactive"} />
                  <StatusBadge ok={selectedReport.online} label={selectedReport.online ? "Online" : "Offline"} />
                  <StatusBadge ok={selectedReport.cookies_enabled} label={selectedReport.cookies_enabled ? "Cookies On" : "Cookies Off"} />
                  <StatusBadge ok={selectedReport.local_storage_available} label={selectedReport.local_storage_available ? "Storage OK" : "Storage Blocked"} />
                </div>

                {/* Device info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Device</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Platform:</span> {selectedReport.platform}</div>
                    <div><span className="text-muted-foreground">Display:</span> {selectedReport.display_mode}</div>
                    <div><span className="text-muted-foreground">Screen:</span> {selectedReport.screen_width}x{selectedReport.screen_height}</div>
                    <div><span className="text-muted-foreground">Viewport:</span> {selectedReport.viewport_width}x{selectedReport.viewport_height}</div>
                    <div><span className="text-muted-foreground">DPR:</span> {selectedReport.device_pixel_ratio}x</div>
                    <div><span className="text-muted-foreground">Connection:</span> {selectedReport.connection_type || "Unknown"}</div>
                  </div>
                </div>

                {/* PWA info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">PWA</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Is PWA:</span> {selectedReport.is_pwa ? "Yes" : "No"}</div>
                    <div><span className="text-muted-foreground">Standalone:</span> {selectedReport.is_standalone ? "Yes" : "No"}</div>
                    <div><span className="text-muted-foreground">Last Route:</span> {selectedReport.pwa_last_route || "N/A"}</div>
                    <div><span className="text-muted-foreground">Last Scope:</span> {selectedReport.pwa_last_scope || "N/A"}</div>
                  </div>
                </div>

                {/* Service Worker */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Service Worker</h4>
                  <p className="text-sm">{selectedReport.service_worker_status}</p>
                  {selectedReport.cache_names && selectedReport.cache_names.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">Caches: {selectedReport.cache_names.join(", ")}</p>
                  )}
                </div>

                {/* Landing Page Tests (from raw_data) */}
                {selectedReport.raw_data && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Landing Page Tests</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedReport.raw_data.webglStatus && (
                        <div className="col-span-2"><span className="text-muted-foreground">WebGL:</span> {selectedReport.raw_data.webglStatus}</div>
                      )}
                      {selectedReport.raw_data.webglRenderer && (
                        <div className="col-span-2"><span className="text-muted-foreground">GPU:</span> {selectedReport.raw_data.webglRenderer}</div>
                      )}
                      {selectedReport.raw_data.threeJsStatus && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Three.js:</span>{' '}
                          <span className={selectedReport.raw_data.threeJsStatus.startsWith('OK') ? 'text-green-600' : 'text-red-600'}>
                            {selectedReport.raw_data.threeJsStatus}
                          </span>
                        </div>
                      )}
                      {selectedReport.raw_data.perfTier && (
                        <div>
                          <span className="text-muted-foreground">Perf Tier:</span>{' '}
                          <span className={selectedReport.raw_data.perfTier === 'high' ? 'text-green-600' : selectedReport.raw_data.perfTier === 'medium' ? 'text-yellow-600' : 'text-red-600'}>
                            {selectedReport.raw_data.perfTier}
                          </span>
                        </div>
                      )}
                      {selectedReport.raw_data.perfReason && (
                        <div><span className="text-muted-foreground">Reason:</span> {selectedReport.raw_data.perfReason}</div>
                      )}
                      {selectedReport.raw_data.measuredFps && (
                        <div><span className="text-muted-foreground">FPS:</span> {selectedReport.raw_data.measuredFps}</div>
                      )}
                      {selectedReport.raw_data.bundleStatus && (
                        <div className="col-span-2"><span className="text-muted-foreground">Cached Bundles:</span> {selectedReport.raw_data.bundleStatus}</div>
                      )}
                      {selectedReport.raw_data.landingCrashLog && (
                        <div className="col-span-2 bg-destructive/10 p-2 rounded text-destructive text-xs">
                          <strong>Landing Crash:</strong> {selectedReport.raw_data.landingCrashLog}
                        </div>
                      )}
                      {selectedReport.raw_data.staticModeEnabled && (
                        <div className="col-span-2"><span className="text-yellow-600">Static mode is enabled</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {selectedReport.errors && selectedReport.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Errors
                    </h4>
                    <div className="space-y-1">
                      {selectedReport.errors.map((err, i) => (
                        <p key={i} className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">{err}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Agent */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">User Agent</h4>
                  <p className="text-xs text-muted-foreground break-all">{selectedReport.user_agent}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedReport.created_at), "dd MMM yyyy HH:mm:ss")}
                </p>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
