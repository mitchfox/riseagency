import { useState, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, ExternalLink, Maximize2, Minimize2, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreamChannel {
  id: string;
  label: string;
  url: string;
  region: string;
  embedMode: 'iframe' | 'link-only';
}

const CHANNELS: StreamChannel[] = [
  { id: "camel", label: "Camel International", url: "https://www.camel1.live/e/home", region: "International", embedMode: "link-only" },
  { id: "sportsebooks", label: "Sportsebooks UK", url: "https://sportsebooks.eu", region: "UK", embedMode: "iframe" },
  { id: "buffstreams", label: "Buffstreams US", url: "https://buffstreams.plus/index2", region: "US", embedMode: "link-only" },
  { id: "chnliga", label: "Chance Liga", url: "https://www.chnliga.tv/cze", region: "Czechia", embedMode: "iframe" },
  { id: "tvcom", label: "TVCom", url: "https://www.tvcom.cz/", region: "Czechia", embedMode: "iframe" },
  { id: "vidio", label: "Vidio Sports", url: "https://www.vidio.com/categories/sports", region: "Indonesia", embedMode: "iframe" },
];

export const StreamsSection = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('streams_active_tab') || CHANNELS[0].id; }
    catch { return CHANNELS[0].id; }
  });
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('streams_expanded') === 'true'; }
    catch { return false; }
  });
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeChannel = CHANNELS.find((c) => c.id === activeTab);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    try { localStorage.setItem('streams_active_tab', tab); } catch {}
  }, []);

  const handleExpandToggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem('streams_expanded', String(next)); } catch {}
      return next;
    });
  }, []);

  const navigateIframe = useCallback((direction: 'back' | 'forward' | 'reload') => {
    const iframe = iframeRefs.current[activeTab];
    if (!iframe?.contentWindow) return;
    try {
      if (direction === 'back') iframe.contentWindow.history.back();
      else if (direction === 'forward') iframe.contentWindow.history.forward();
      else iframe.contentWindow.location.reload();
    } catch {
      // Cross-origin restriction — reload by resetting src
      if (direction === 'reload' && iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => { iframe.src = src; }, 50);
      }
    }
  }, [activeTab]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Streams
          </CardTitle>
          <div className="flex items-center gap-1">
            {activeChannel?.embedMode === 'iframe' && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateIframe('back')} title="Back">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateIframe('forward')} title="Forward">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateIframe('reload')} title="Reload">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpandToggle}
              title={expanded ? "Collapse" : "Theatre mode"}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {activeChannel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(activeChannel.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Open in tab
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="px-4 pb-2">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {CHANNELS.map((ch) => (
                <TabsTrigger
                  key={ch.id}
                  value={ch.id}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span>{ch.label}</span>
                  <span className="ml-1.5 text-[10px] opacity-60">{ch.region}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {CHANNELS.map((ch) => (
            <TabsContent key={ch.id} value={ch.id} className="mt-0 p-0">
              <div className="px-4 pb-4">
                {ch.embedMode === 'link-only' ? (
                  <div className={`w-full rounded-lg border border-border/50 bg-muted/30 flex flex-col items-center justify-center gap-4 ${expanded ? "h-[85vh]" : "h-[600px]"}`}>
                    <Tv className="h-16 w-16 text-muted-foreground/40" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">{ch.label}</p>
                      <p className="text-xs text-muted-foreground">This source doesn't support embedding. Click below to open it directly.</p>
                    </div>
                    <Button onClick={() => window.open(ch.url, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open {ch.label}
                    </Button>
                  </div>
                ) : (
                  <iframe
                    ref={(el) => { iframeRefs.current[ch.id] = el; }}
                    src={ch.url}
                    title={ch.label}
                    className={`w-full rounded-lg border border-border/50 bg-black ${expanded ? "h-[85vh]" : "h-[600px]"}`}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-storage-access-by-user-activation"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
