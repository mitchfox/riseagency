import { useState, useRef, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, ExternalLink, Maximize2, Minimize2, ArrowLeft, ArrowRight, RotateCcw, Link as LinkIcon, Settings, Eye, EyeOff, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface StreamChannel {
  id: string;
  label: string;
  url: string;
  region: string;
  embedMode: 'iframe' | 'link-only';
  isCustom?: boolean;
}

interface StreamCredentials {
  username: string;
  password: string;
}

const DEFAULT_CHANNELS: StreamChannel[] = [
  { id: "chnliga", label: "Chance Liga", url: "https://www.chnliga.tv/cze", region: "Czechia", embedMode: "iframe" },
  { id: "tvcom", label: "TVCom", url: "https://www.tvcom.cz/", region: "Czechia", embedMode: "iframe" },
  { id: "vidio", label: "Vidio Sports", url: "https://www.vidio.com/categories/sports", region: "Indonesia", embedMode: "iframe" },
  { id: "sportsebooks", label: "Sportsebooks UK", url: "https://sportsebooks.eu", region: "UK", embedMode: "iframe" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com", region: "Global", embedMode: "iframe" },
  { id: "ytmusic", label: "YouTube Music", url: "https://music.youtube.com", region: "Global", embedMode: "iframe" },
  { id: "camel", label: "Camel International", url: "https://www.camel1.live/e/home", region: "International", embedMode: "link-only" },
  { id: "buffstreams", label: "Buffstreams US", url: "https://buffstreams.plus/index2", region: "US", embedMode: "link-only" },
];

const loadCustomChannels = (): StreamChannel[] => {
  try {
    return JSON.parse(localStorage.getItem('streams_custom_channels') || '[]');
  } catch { return []; }
};

const saveCustomChannels = (channels: StreamChannel[]) => {
  try { localStorage.setItem('streams_custom_channels', JSON.stringify(channels)); } catch {}
};

export const StreamsSection = () => {
  const [customChannels, setCustomChannels] = useState<StreamChannel[]>(loadCustomChannels);
  const allChannels = [...DEFAULT_CHANNELS, ...customChannels];
  const embeddableChannels = allChannels.filter(c => c.embedMode === 'iframe');
  const linkOnlyChannels = allChannels.filter(c => c.embedMode === 'link-only');

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('streams_active_tab') || DEFAULT_CHANNELS[0].id; }
    catch { return DEFAULT_CHANNELS[0].id; }
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

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<StreamChannel | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formEmbed, setFormEmbed] = useState<'iframe' | 'link-only'>('iframe');

  const activeChannel = allChannels.find((c) => c.id === activeTab);

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

  const openAddDialog = () => {
    setEditingChannel(null);
    setFormLabel("");
    setFormUrl("");
    setFormRegion("");
    setFormEmbed("iframe");
    setDialogOpen(true);
  };

  const openEditDialog = (ch: StreamChannel) => {
    setEditingChannel(ch);
    setFormLabel(ch.label);
    setFormUrl(ch.url);
    setFormRegion(ch.region);
    setFormEmbed(ch.embedMode);
    setDialogOpen(true);
  };

  const handleSaveChannel = () => {
    if (!formLabel || !formUrl) return;
    if (editingChannel) {
      // Editing existing
      if (editingChannel.isCustom) {
        const updated = customChannels.map(c =>
          c.id === editingChannel.id
            ? { ...c, label: formLabel, url: formUrl, region: formRegion, embedMode: formEmbed }
            : c
        );
        setCustomChannels(updated);
        saveCustomChannels(updated);
      }
    } else {
      // Adding new
      const newChannel: StreamChannel = {
        id: `custom-${Date.now()}`,
        label: formLabel,
        url: formUrl,
        region: formRegion || "Custom",
        embedMode: formEmbed,
        isCustom: true,
      };
      const updated = [...customChannels, newChannel];
      setCustomChannels(updated);
      saveCustomChannels(updated);
      setActiveTab(newChannel.id);
      try { localStorage.setItem('streams_active_tab', newChannel.id); } catch {}
    }
    setDialogOpen(false);
  };

  const handleDeleteChannel = (id: string) => {
    const updated = customChannels.filter(c => c.id !== id);
    setCustomChannels(updated);
    saveCustomChannels(updated);
    if (activeTab === id) {
      const fallback = DEFAULT_CHANNELS[0].id;
      setActiveTab(fallback);
      try { localStorage.setItem('streams_active_tab', fallback); } catch {}
    }
  };

  const renderTabWithTooltip = (ch: StreamChannel, showLinkIcon = false) => {
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
              {showLinkIcon && <LinkIcon className="h-3 w-3 mr-1 opacity-60" />}
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
            {/* Edit button for custom channels */}
            {activeChannel?.isCustom && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(activeChannel)} title="Edit stream">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
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
              {embeddableChannels.map(ch => renderTabWithTooltip(ch))}
              {linkOnlyChannels.length > 0 && <Separator orientation="vertical" className="h-6 mx-1" />}
              {linkOnlyChannels.map(ch => renderTabWithTooltip(ch, true))}
              <Separator orientation="vertical" className="h-6 mx-1" />
              <button
                onClick={openAddDialog}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </TabsList>
          </div>

          {allChannels.map((ch) => (
            <TabsContent key={ch.id} value={ch.id} className="mt-0 p-0">
              <div className="px-4 pb-4">
                {ch.embedMode === 'link-only' ? (
                  <div className={`w-full rounded-lg border border-border/50 bg-muted/30 flex flex-col items-center justify-center gap-4 ${expanded ? "h-[85vh]" : "h-[600px]"}`}>
                    <Tv className="h-16 w-16 text-muted-foreground/40" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">{ch.label}</p>
                      <p className="text-xs text-muted-foreground">This source doesn't support embedding. Click below to open it directly.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => window.open(ch.url, "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open {ch.label}
                      </Button>
                      {ch.isCustom && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteChannel(ch.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
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
                    {ch.isCustom && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button variant="secondary" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => openEditDialog(ch)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => handleDeleteChannel(ch.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Add / Edit Stream Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Edit Stream" : "Add Stream"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input placeholder="e.g. Sky Sports" value={formLabel} onChange={e => setFormLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input placeholder="https://..." value={formUrl} onChange={e => setFormUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Region</Label>
                <Input placeholder="e.g. UK" value={formRegion} onChange={e => setFormRegion(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Embed Mode</Label>
                <Select value={formEmbed} onValueChange={(v: 'iframe' | 'link-only') => setFormEmbed(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iframe">Embed (iframe)</SelectItem>
                    <SelectItem value="link-only">Link only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editingChannel?.isCustom && (
                <Button variant="destructive" size="sm" onClick={() => { handleDeleteChannel(editingChannel.id); setDialogOpen(false); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveChannel} disabled={!formLabel || !formUrl}>
                {editingChannel ? "Save Changes" : "Add Stream"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
