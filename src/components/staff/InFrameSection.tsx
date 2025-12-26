import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Instagram, MessageCircle, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FrameTab {
  id: string;
  label: string;
  icon: React.ElementType;
  url: string;
  directUrl: string;
}

const FRAME_TABS: FrameTab[] = [
  {
    id: "gmail",
    label: "Gmail",
    icon: Mail,
    url: "https://mail.google.com/mail/u/0/#inbox",
    directUrl: "https://mail.google.com",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    url: "https://www.instagram.com/direct/inbox/",
    directUrl: "https://www.instagram.com",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    url: "https://web.whatsapp.com/",
    directUrl: "https://web.whatsapp.com",
  },
];

export const InFrameSection = () => {
  const [activeTab, setActiveTab] = useState("gmail");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [errorTabs, setErrorTabs] = useState<Set<string>>(new Set());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (!loadedTabs.has(value)) {
      setLoadedTabs(prev => new Set([...prev, value]));
    }
  };

  const handleIframeError = (tabId: string) => {
    setErrorTabs(prev => new Set([...prev, tabId]));
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">In Frame</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="px-4">
            <TabsList className="w-full grid grid-cols-3">
              {FRAME_TABS.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {FRAME_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 p-0">
              <div className="relative">
                {/* Info banner about iframe limitations */}
                <Alert className="m-4 mb-0 border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {tab.label} blocks direct embedding for security. Open in a new tab to use.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewTab(tab.directUrl)}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      Open {tab.label}
                    </Button>
                  </AlertDescription>
                </Alert>

                {/* Placeholder showing the service would appear here */}
                <div className="h-[500px] m-4 rounded-lg border border-border/50 bg-muted/30 flex flex-col items-center justify-center gap-4">
                  {(() => {
                    const IconComponent = tab.icon;
                    return (
                      <>
                        <div className="p-6 rounded-full bg-muted">
                          <IconComponent className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-medium">{tab.label}</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            For security reasons, {tab.label} cannot be embedded directly.
                            Click the button above to open it in a new tab.
                          </p>
                        </div>
                        <Button
                          onClick={() => openInNewTab(tab.directUrl)}
                          className="mt-2"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open {tab.label}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
