import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Edit, Trash2, ChevronDown, MessageSquare, GitBranch, ListTree, AlertTriangle, Loader2, Workflow, List as ListIcon } from "lucide-react";
import { toast } from "sonner";
import { MessagingScriptsFlow, type FlowNode } from "./MessagingScriptsFlow";

type Script = { id: string; title: string; description: string | null; sort_order: number };
type Node = {
  id: string; script_id: string; parent_node_id: string | null;
  kind: "step" | "choice_group" | "option";
  branch_label: string | null; content: string | null;
  optional: boolean; sort_order: number;
};
type Objection = { id: string; script_id: string; objection: string; response: string | null; sort_order: number };

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied");
};

export const MessagingScripts = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingScript, setEditingScript] = useState<Partial<Script> | null>(null);
  const [editingNode, setEditingNode] = useState<(Partial<Node> & { script_id: string }) | null>(null);
  const [editingObjection, setEditingObjection] = useState<(Partial<Objection> & { script_id: string }) | null>(null);
  const [view, setView] = useState<"list" | "flow">("flow");

  const fetchScripts = async () => {
    const { data } = await (supabase as any).from("messaging_scripts").select("*").order("sort_order").order("created_at");
    setScripts((data || []) as Script[]);
    if (!selectedId && data && data.length) setSelectedId(data[0].id);
    setLoading(false);
  };
  const fetchScriptDetail = async (id: string) => {
    const [n, o] = await Promise.all([
      (supabase as any).from("messaging_script_nodes").select("*").eq("script_id", id).order("sort_order"),
      (supabase as any).from("messaging_script_objections").select("*").eq("script_id", id).order("sort_order"),
    ]);
    setNodes((n.data || []) as Node[]);
    setObjections((o.data || []) as Objection[]);
  };

  useEffect(() => { fetchScripts(); }, []);
  useEffect(() => { if (selectedId) fetchScriptDetail(selectedId); }, [selectedId]);

  const selected = useMemo(() => scripts.find((s) => s.id === selectedId) || null, [scripts, selectedId]);
  const rootNodes = useMemo(() => nodes.filter((n) => !n.parent_node_id).sort((a, b) => a.sort_order - b.sort_order), [nodes]);
  const childrenOf = (id: string) => nodes.filter((n) => n.parent_node_id === id).sort((a, b) => a.sort_order - b.sort_order);

  const saveScript = async () => {
    if (!editingScript || !editingScript.title?.trim()) return toast.error("Title required");
    const payload = { title: editingScript.title, description: editingScript.description ?? null, sort_order: editingScript.sort_order ?? scripts.length };
    if (editingScript.id) {
      await (supabase as any).from("messaging_scripts").update(payload).eq("id", editingScript.id);
    } else {
      const { data } = await (supabase as any).from("messaging_scripts").insert(payload).select().single();
      if (data) setSelectedId(data.id);
    }
    setEditingScript(null); fetchScripts();
  };
  const deleteScript = async (id: string) => {
    if (!confirm("Delete this script and all its content?")) return;
    await (supabase as any).from("messaging_scripts").delete().eq("id", id);
    if (selectedId === id) setSelectedId(null);
    fetchScripts();
  };

  const saveNode = async () => {
    if (!editingNode) return;
    const payload = {
      script_id: editingNode.script_id,
      parent_node_id: editingNode.parent_node_id ?? null,
      kind: editingNode.kind || "step",
      branch_label: editingNode.branch_label ?? null,
      content: editingNode.content ?? null,
      optional: editingNode.optional ?? false,
      sort_order: editingNode.sort_order ?? 0,
    };
    if (editingNode.id) {
      await (supabase as any).from("messaging_script_nodes").update(payload).eq("id", editingNode.id);
    } else {
      await (supabase as any).from("messaging_script_nodes").insert(payload);
    }
    setEditingNode(null);
    if (selectedId) fetchScriptDetail(selectedId);
  };
  const deleteNode = async (id: string) => {
    if (!confirm("Delete this step and all branches under it?")) return;
    await (supabase as any).from("messaging_script_nodes").delete().eq("id", id);
    if (selectedId) fetchScriptDetail(selectedId);
  };

  const saveObjection = async () => {
    if (!editingObjection || !editingObjection.objection?.trim()) return;
    const payload = {
      script_id: editingObjection.script_id,
      objection: editingObjection.objection,
      response: editingObjection.response ?? null,
      sort_order: editingObjection.sort_order ?? objections.length,
    };
    if (editingObjection.id) {
      await (supabase as any).from("messaging_script_objections").update(payload).eq("id", editingObjection.id);
    } else {
      await (supabase as any).from("messaging_script_objections").insert(payload);
    }
    setEditingObjection(null);
    if (selectedId) fetchScriptDetail(selectedId);
  };
  const deleteObjection = async (id: string) => {
    await (supabase as any).from("messaging_script_objections").delete().eq("id", id);
    if (selectedId) fetchScriptDetail(selectedId);
  };

  const renderNode = (node: Node, depth = 0): JSX.Element => {
    const kids = childrenOf(node.id);
    const isChoiceGroup = node.kind === "choice_group";
    const isOption = node.kind === "option";
    return (
      <div
        key={node.id}
        className={`rounded-lg border p-3 sm:p-4 space-y-2 ${node.optional ? "opacity-60" : ""}`}
        style={{ marginLeft: depth * 12 }}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isChoiceGroup ? <ListTree className="h-4 w-4 text-primary" /> :
              isOption ? <GitBranch className="h-4 w-4 text-primary" /> :
              <MessageSquare className="h-4 w-4 text-primary" />}
            {node.branch_label && <Badge variant="outline" className="text-xs">{node.branch_label}</Badge>}
            <Badge variant="secondary" className="text-xs capitalize">{node.kind.replace("_", " ")}</Badge>
            {node.optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {node.content && (
              <Button size="sm" variant="ghost" onClick={() => copyText(node.content!)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditingNode(node)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => deleteNode(node.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {node.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{node.content}</p>}
        {kids.length > 0 && <div className="space-y-2 pt-2">{kids.map((k) => renderNode(k, depth + 1))}</div>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setEditingNode({
            script_id: node.script_id, parent_node_id: node.id, kind: "step",
            sort_order: kids.length,
          })}>
            <Plus className="h-3 w-3 mr-1" /> Step
          </Button>
          {!isOption && (
            <Button size="sm" variant="outline" onClick={() => setEditingNode({
              script_id: node.script_id, parent_node_id: node.id, kind: "choice_group",
              sort_order: kids.length, branch_label: "Pick one",
            })}>
              <Plus className="h-3 w-3 mr-1" /> Choice group
            </Button>
          )}
          {isChoiceGroup && (
            <Button size="sm" variant="outline" onClick={() => setEditingNode({
              script_id: node.script_id, parent_node_id: node.id, kind: "option",
              sort_order: kids.length, branch_label: `Option ${kids.length + 1}`,
            })}>
              <Plus className="h-3 w-3 mr-1" /> Option
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading scripts...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          {scripts.map((s) => (
            <Button key={s.id} size="sm" variant={selectedId === s.id ? "default" : "outline"} onClick={() => setSelectedId(s.id)}>
              {s.title}
            </Button>
          ))}
          {scripts.length === 0 && <span className="text-sm text-muted-foreground">No scripts yet.</span>}
        </div>
        <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setView("flow")}
            className={`px-2.5 py-1 text-xs rounded-sm inline-flex items-center gap-1 ${view === "flow" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <Workflow className="h-3.5 w-3.5" />Flow
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-2.5 py-1 text-xs rounded-sm inline-flex items-center gap-1 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <ListIcon className="h-3.5 w-3.5" />List
          </button>
        </div>
        <Button size="sm" onClick={() => setEditingScript({ title: "", description: "", sort_order: scripts.length })}>
          <Plus className="h-4 w-4 mr-1" /> New Script
        </Button>
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>{selected.title}</CardTitle>
                {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingScript(selected)}><Edit className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteScript(selected.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {view === "flow" ? (
              <div className="space-y-2">
                <MessagingScriptsFlow
                  nodes={nodes as FlowNode[]}
                  onEdit={(n) => setEditingNode(n as any)}
                  onDelete={deleteNode}
                  onCopy={copyText}
                  onAddRoot={() => setEditingNode({ script_id: selected.id, parent_node_id: null, kind: "step", sort_order: rootNodes.length })}
                  onAddChild={(parent, kind) => setEditingNode({
                    script_id: parent.script_id,
                    parent_node_id: parent.id,
                    kind,
                    sort_order: childrenOf(parent.id).length,
                    branch_label: kind === "choice_group" ? "Pick one" : kind === "option" ? `Option ${childrenOf(parent.id).length + 1}` : null,
                  })}
                />
                {nodes.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setEditingNode({
                    script_id: selected.id, parent_node_id: null, kind: "step", sort_order: rootNodes.length,
                  })}>
                    <Plus className="h-4 w-4 mr-1" /> Add root step
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {rootNodes.map((n) => renderNode(n))}
                <Button size="sm" variant="outline" onClick={() => setEditingNode({
                  script_id: selected.id, parent_node_id: null, kind: "step", sort_order: rootNodes.length,
                })}>
                  <Plus className="h-4 w-4 mr-1" /> Add first step
                </Button>
              </div>
            )}

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />Common Objections ({objections.length})</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-3">
                {objections.map((o) => (
                  <div key={o.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">{o.objection}</p>
                      <div className="flex gap-1">
                        {o.response && <Button size="sm" variant="ghost" onClick={() => copyText(o.response!)}><Copy className="h-3.5 w-3.5" /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => setEditingObjection(o)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteObjection(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {o.response && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.response}</p>}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setEditingObjection({ script_id: selected.id, objection: "", response: "", sort_order: objections.length })}>
                  <Plus className="h-4 w-4 mr-1" /> Add objection
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Script editor */}
      <Dialog open={!!editingScript} onOpenChange={(o) => !o && setEditingScript(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingScript?.id ? "Edit Script" : "New Script"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={editingScript?.title || ""} onChange={(e) => setEditingScript({ ...editingScript!, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editingScript?.description || ""} onChange={(e) => setEditingScript({ ...editingScript!, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingScript(null)}>Cancel</Button><Button onClick={saveScript}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node editor */}
      <Dialog open={!!editingNode} onOpenChange={(o) => !o && setEditingNode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingNode?.id ? "Edit" : "Add"} {editingNode?.kind?.replace("_", " ")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Branch / label (optional)</Label><Input value={editingNode?.branch_label || ""} onChange={(e) => setEditingNode({ ...editingNode!, branch_label: e.target.value })} placeholder="e.g. If they reply YES" /></div>
            <div><Label>Content / message</Label><Textarea rows={6} value={editingNode?.content || ""} onChange={(e) => setEditingNode({ ...editingNode!, content: e.target.value })} placeholder="Write the exact text to send..." /></div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editingNode?.optional} onCheckedChange={(v) => setEditingNode({ ...editingNode!, optional: v })} />
              <Label>Optional (shown faded)</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingNode(null)}>Cancel</Button><Button onClick={saveNode}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objection editor */}
      <Dialog open={!!editingObjection} onOpenChange={(o) => !o && setEditingObjection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingObjection?.id ? "Edit" : "Add"} Objection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Objection</Label><Input value={editingObjection?.objection || ""} onChange={(e) => setEditingObjection({ ...editingObjection!, objection: e.target.value })} placeholder="e.g. We already have an agent" /></div>
            <div><Label>Response</Label><Textarea rows={6} value={editingObjection?.response || ""} onChange={(e) => setEditingObjection({ ...editingObjection!, response: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingObjection(null)}>Cancel</Button><Button onClick={saveObjection}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagingScripts;