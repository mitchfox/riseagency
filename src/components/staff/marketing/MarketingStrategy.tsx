import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Platform {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface StrategySection {
  id: string;
  platform_id: string;
  title: string;
  content: string | null;
  sort_order: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `tab-${Date.now()}`;

export const MarketingStrategy = ({ canManage }: { canManage: boolean }) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [sections, setSections] = useState<StrategySection[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [renamingTab, setRenamingTab] = useState<Platform | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: plats }, { data: secs }] = await Promise.all([
      supabase.from("marketing_strategy_platforms").select("*").order("sort_order", { ascending: true }),
      supabase.from("marketing_strategy_sections").select("*").order("sort_order", { ascending: true }),
    ]);
    setPlatforms((plats as Platform[]) || []);
    setSections((secs as StrategySection[]) || []);
    setActiveId(prev => prev || (plats?.[0]?.id ?? ""));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addPlatform = async () => {
    const name = newTabName.trim();
    if (!name) return;
    const slug = slugify(name);
    const maxOrder = Math.max(0, ...platforms.map(p => p.sort_order));
    const { data, error } = await supabase
      .from("marketing_strategy_platforms")
      .insert({ name, slug, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setPlatforms(prev => [...prev, data as Platform]);
    setActiveId((data as Platform).id);
    setNewTabName("");
    setShowAddTab(false);
    toast.success("Tab added");
  };

  const renamePlatform = async () => {
    if (!renamingTab || !renameValue.trim()) return;
    const { error } = await supabase
      .from("marketing_strategy_platforms")
      .update({ name: renameValue.trim() })
      .eq("id", renamingTab.id);
    if (error) { toast.error(error.message); return; }
    setPlatforms(prev => prev.map(p => p.id === renamingTab.id ? { ...p, name: renameValue.trim() } : p));
    setRenamingTab(null);
    toast.success("Renamed");
  };

  const deletePlatform = async (id: string) => {
    if (!confirm("Delete this tab and all its sections?")) return;
    const { error } = await supabase.from("marketing_strategy_platforms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    const remaining = platforms.filter(p => p.id !== id);
    setPlatforms(remaining);
    setSections(prev => prev.filter(s => s.platform_id !== id));
    if (activeId === id) setActiveId(remaining[0]?.id || "");
    toast.success("Tab removed");
  };

  const addSection = async (platformId: string) => {
    const platformSections = sections.filter(s => s.platform_id === platformId);
    const maxOrder = Math.max(0, ...platformSections.map(s => s.sort_order));
    const { data, error } = await supabase
      .from("marketing_strategy_sections")
      .insert({ platform_id: platformId, title: "New section", content: "", sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSections(prev => [...prev, data as StrategySection]);
  };

  const updateSectionLocal = (id: string, patch: Partial<StrategySection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const saveSection = async (section: StrategySection) => {
    setSavingId(section.id);
    const { error } = await supabase
      .from("marketing_strategy_sections")
      .update({ title: section.title, content: section.content })
      .eq("id", section.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    const { error } = await supabase.from("marketing_strategy_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSections(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            Strategic planning per platform. Give a clear identity to what we are building on each channel.
          </p>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setShowAddTab(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add tab
          </Button>
        )}
      </div>

      {platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No tabs yet. Create one to start planning.</p>
      ) : (
        <Tabs value={activeId} onValueChange={setActiveId} className="w-full">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
            {platforms.map(p => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs sm:text-sm">
                {p.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {platforms.map(platform => {
            const platSections = sections.filter(s => s.platform_id === platform.id);
            return (
              <TabsContent key={platform.id} value={platform.id} className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold">{platform.name} strategy</h3>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setRenamingTab(platform); setRenameValue(platform.name); }}>
                        <Pencil className="w-4 h-4 mr-1" /> Rename
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePlatform(platform.id)}>
                        <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Remove tab
                      </Button>
                      <Button size="sm" onClick={() => addSection(platform.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Add section
                      </Button>
                    </div>
                  )}
                </div>

                {platSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                    No sections yet for {platform.name}.
                  </p>
                ) : platSections.map(section => (
                  <Card key={section.id} className="bg-card/60">
                    <CardHeader className="pb-2 px-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.title}
                          onChange={e => updateSectionLocal(section.id, { title: e.target.value })}
                          disabled={!canManage}
                          className="font-semibold text-base bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-b"
                        />
                        {canManage && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => saveSection(section)} disabled={savingId === section.id}>
                              {savingId === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteSection(section.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 pt-0">
                      <Textarea
                        value={section.content ?? ""}
                        onChange={e => updateSectionLocal(section.id, { content: e.target.value })}
                        disabled={!canManage}
                        rows={6}
                        placeholder={`Outline the strategy, tone, target viewer, posting cadence, KPIs...`}
                        onBlur={() => saveSection(section)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Dialog open={showAddTab} onOpenChange={setShowAddTab}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New strategy tab</DialogTitle>
            <DialogDescription>Add a platform or channel to plan for.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Threads, Newsletter, Podcast"
            value={newTabName}
            onChange={e => setNewTabName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlatform()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTab(false)}>Cancel</Button>
            <Button onClick={addPlatform} disabled={!newTabName.trim()}>Add tab</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renamingTab} onOpenChange={(o) => { if (!o) setRenamingTab(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rename tab</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && renamePlatform()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingTab(null)}>Cancel</Button>
            <Button onClick={renamePlatform} disabled={!renameValue.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingStrategy;