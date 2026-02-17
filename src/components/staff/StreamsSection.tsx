import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreamChannel {
  id: string;
  label: string;
  url: string;
  region: string;
}

const CHANNELS: StreamChannel[] = [
  { id: "camel", label: "Camel International", url: "https://www.camel1.live/e/home", region: "International" },
  { id: "sportsebooks", label: "Sportsebooks UK", url: "https://sportsebooks.eu", region: "UK" },
  { id: "buffstreams", label: "Buffstreams US", url: "https://buffstreams.plus/index2", region: "US" },
  { id: "chnliga", label: "Chance Liga", url: "https://www.chnliga.tv/cze", region: "Czechia" },
  { id: "tvcom", label: "TVCom", url: "https://www.tvcom.cz/", region: "Czechia" },
  { id: "vidio", label: "Vidio Sports", url: "https://www.vidio.com/categories/sports", region: "Indonesia" },
];

export const StreamsSection = () => {
  const [activeTab, setActiveTab] = useState(CHANNELS[0].id);
  const [expanded, setExpanded] = useState(false);

  const activeChannel = CHANNELS.find((c) => c.id === activeTab);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Streams
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Collapse" : "Expand"}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <iframe
                  src={ch.url}
                  title={ch.label}
                  className={`w-full rounded-lg border border-border/50 bg-black ${expanded ? "h-[85vh]" : "h-[600px]"}`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
