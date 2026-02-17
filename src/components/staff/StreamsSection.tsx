import { useState, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, ExternalLink, Maximize2, Minimize2, ArrowLeft, ArrowRight, RotateCcw, Link as LinkIcon, Settings, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StreamChannel {
  id: string;
  label: string;
  url: string;
  region: string;
  embedMode: 'iframe' | 'link-only';
}

interface StreamCredentials {
  username: string;
  password: string;
}

// Embeddable streams first, then link-only separated
const EMBEDDABLE_CHANNELS: StreamChannel[] = [
  { id: "chnliga", label: "Chance Liga", url: "https://www.chnliga.tv/cze", region: "Czechia", embedMode: "iframe" },
  { id: "tvcom", label: "TVCom", url: "https://www.tvcom.cz/", region: "Czechia", embedMode: "iframe" },
  { id: "vidio", label: "Vidio Sports", url: "https://www.vidio.com/categories/sports", region: "Indonesia", embedMode: "iframe" },
  { id: "sportsebooks", label: "Sportsebooks UK", url: "https://sportsebooks.eu", region: "UK", embedMode: "iframe" },
];

const LINK_ONLY_CHANNELS: StreamChannel[] = [
  { id: "camel", label: "Camel International", url: "https://www.camel1.live/e/home", region: "International", embedMode: "link-only" },
  { id: "buffstreams", label: "Buffstreams US", url: "https://buffstreams.plus/index2", region: "US", embedMode: "link-only" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com", region: "Global", embedMode: "link-only" },
  { id: "ytmusic", label: "YouTube Music", url: "https://music.youtube.com", region: "Global", embedMode: "link-only" },
];

const ALL_CHANNELS = [...EMBEDDABLE_CHANNELS, ...LINK_ONLY_CHANNELS];

export const StreamsSection = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('streams_active_tab') || EMBEDDABLE_CHANNELS[0].id; }
    catch { return EMBEDDABLE_CHANNELS[0].id; }
  });
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('streams_expanded') === 'true'; }
    catch { return false; }
  });
  const [credentials, setCredentials] = useState<Record<string, StreamCredentials>>(() => {
    try { return JSON.parse(localStorage.getItem('streams_credentials') || '{}'); }
    catch { return {}; }
  });
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeChannel = ALL_CHANNELS.find((c) => c.id === activeTab);

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
      if (direction === 'reload' && iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => { iframe.src = src; }, 50);
      }
    }
  }, [activeTab]);

  const saveCredentials = useCallback((channelId: string, creds: StreamCredentials) => {
    setCredentials(prev => {
      const updated = { ...prev, [channelId]: creds };
      try { localStorage.setItem('streams_credentials', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const getCredentials = (channelId: string): StreamCredentials => {
    return credentials[channelId] || { username: '', password: '' };
  };

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
            {/* Credentials settings */}
            {activeChannel && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Stream credentials">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-3">
                    <p className="text-xs font-medium">{activeChannel.label} Credentials</p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Username / email"
                        value={getCredentials(activeChannel.id).username}
                        onChange={e => saveCredentials(activeChannel.id, { ...getCredentials(activeChannel.id), username: e.target.value })}
                        className="h-7 text-xs"
                      />
                      <div className="relative">
                        <Input
                          type={showPassword[activeChannel.id] ? "text" : "password"}
                          placeholder="Password"
                          value={getCredentials(activeChannel.id).password}
                          onChange={e => saveCredentials(activeChannel.id, { ...getCredentials(activeChannel.id), password: e.target.value })}
                          className="h-7 text-xs pr-8"
                        />
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(prev => ({ ...prev, [activeChannel.id]: !prev[activeChannel.id] }))}
                        >
                          {showPassword[activeChannel.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Saved locally for quick reference when logging in.</p>
                  </div>
                </PopoverContent>
              </Popover>
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
              {EMBEDDABLE_CHANNELS.map((ch) => {
                const creds = getCredentials(ch.id);
                const hasCreds = creds.username || creds.password;
                return (
                  <TooltipProvider key={ch.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={ch.id}
                          className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <span>{ch.label}</span>
                          <span className="ml-1.5 text-[10px] opacity-60">{ch.region}</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      {hasCreds && (
                        <TooltipContent side="bottom" className="text-xs space-y-0.5">
                          {creds.username && <p>User: {creds.username}</p>}
                          {creds.password && <p>Pass: {'•'.repeat(Math.min(creds.password.length, 12))}</p>}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {/* Divider */}
              <Separator orientation="vertical" className="h-6 mx-1" />
              {LINK_ONLY_CHANNELS.map((ch) => {
                const creds = getCredentials(ch.id);
                const hasCreds = creds.username || creds.password;
                return (
                  <TooltipProvider key={ch.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={ch.id}
                          className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <LinkIcon className="h-3 w-3 mr-1 opacity-60" />
                          <span>{ch.label}</span>
                          <span className="ml-1.5 text-[10px] opacity-60">{ch.region}</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      {hasCreds && (
                        <TooltipContent side="bottom" className="text-xs space-y-0.5">
                          {creds.username && <p>User: {creds.username}</p>}
                          {creds.password && <p>Pass: {'•'.repeat(Math.min(creds.password.length, 12))}</p>}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </TabsList>
          </div>

          {ALL_CHANNELS.map((ch) => (
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
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
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
