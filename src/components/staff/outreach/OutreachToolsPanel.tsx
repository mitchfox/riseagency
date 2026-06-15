import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Check, X, Plus, ExternalLink, Trash2, Wrench, FileText, Link as LinkIcon, Pencil } from "lucide-react";
import { toast } from "sonner";

type DocKind = "doc" | "resource" | "tool";
type Doc = {
  id: string;
  title: string;
  kind: DocKind;
  body: string | null;
  url: string | null;
  sort_order: number;
};
type Item = {
  id: string;
  doc_id: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  sort_order: number;
};

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  inline?: boolean;
}

export default function OutreachToolsPanel({ open = true, onOpenChange, inline = true }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [newDoc, setNewDoc] = useState<{ title: string; kind: DocKind; body: string; url: string }>({
    title: "",
    kind: "doc",
    body: "",
    url: "",
  });
  const [newItemBody, setNewItemBody] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: d }, { data: i }] = await Promise.all([
      (supabase as any).from("outreach_tools_docs").select("*").order("sort_order"),
      (supabase as any).from("outreach_tools_doc_items").select("*").order("sort_order"),
    ]);
    setDocs((d ?? []) as Doc[]);
    setItems((i ?? []) as Item[]);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const itemsByDoc = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.doc_id) ?? [];
      arr.push(it);
      map.set(it.doc_id, arr);
    }
    return map;
  }, [items]);

  const decide = async (it: Item, status: "approved" | "rejected") => {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status } : x)));
    const { error } = await (supabase as any)
      .from("outreach_tools_doc_items")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", it.id);
    if (error) { toast.error(error.message); load(); }
  };

  const startEdit = (it: Item) => {
    setEditingItemId(it.id);
    setEditDraft(it.body);
  };

  const saveEdit = async (it: Item) => {
    const body = editDraft.trim();
    if (!body) { setEditingItemId(null); return; }
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, body } : x)));
    setEditingItemId(null);
    const { error } = await (supabase as any)
      .from("outreach_tools_doc_items")
      .update({ body })
      .eq("id", it.id);
    if (error) { toast.error(error.message); load(); }
  };

  const deleteItem = async (it: Item) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await (supabase as any).from("outreach_tools_doc_items").delete().eq("id", it.id);
  };

  const resetItem = async (it: Item) => {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "pending" } : x)));
    await (supabase as any)
      .from("outreach_tools_doc_items")
      .update({ status: "pending", decided_at: null })
      .eq("id", it.id);
  };

  const addItem = async (docId: string) => {
    const body = (newItemBody[docId] ?? "").trim();
    if (!body) return;
    const max = Math.max(0, ...((itemsByDoc.get(docId) ?? []).map((i) => i.sort_order)));
    const { error } = await (supabase as any)
      .from("outreach_tools_doc_items")
      .insert({ doc_id: docId, body, status: "approved", sort_order: max + 1 });
    if (error) { toast.error(error.message); return; }
    setNewItemBody((p) => ({ ...p, [docId]: "" }));
    load();
  };

  const createDoc = async () => {
    if (!newDoc.title.trim()) { toast.error("Title required"); return; }
    const { error } = await (supabase as any).from("outreach_tools_docs").insert({
      title: newDoc.title.trim(),
      kind: newDoc.kind,
      body: newDoc.body.trim() || null,
      url: newDoc.url.trim() || null,
      sort_order: (docs[docs.length - 1]?.sort_order ?? 0) + 1,
    });
    if (error) { toast.error(error.message); return; }
    setAddOpen(false);
    setNewDoc({ title: "", kind: "doc", body: "", url: "" });
    load();
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm("Delete this resource and all its items?")) return;
    const { error } = await (supabase as any).from("outreach_tools_docs").delete().eq("id", docId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const kindIcon = (k: DocKind) =>
    k === "tool" ? <Wrench className="w-3.5 h-3.5" /> : k === "resource" ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />;

  const body = (
    <div className="flex flex-col">
      <div className="px-1 py-3 flex flex-wrap gap-2 items-center border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across all docs"
            className="w-full sm:w-72 h-9"
          />
          <div className="flex gap-1 rounded-md border border-border p-0.5 text-xs">
            {(["pending", "approved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded ${filter === f ? "bg-[#C6A332] text-black font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f === "pending" ? "Pending" : f === "approved" ? "Kept" : "All"}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="ml-auto bg-[#C6A332] text-black hover:bg-[#C6A332]/90"
          >
            <Plus className="w-4 h-4 mr-1" /> Add resource
          </Button>
        </div>

        <div className="px-1 py-4 space-y-3">
          {docs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No tools or docs yet. Add a resource to get started.
            </p>
          )}
          {docs.map((d) => {
            const expanded = expandedDocId === d.id;
            const all = itemsByDoc.get(d.id) ?? [];
            const visible = all.filter((it) => {
              if (filter === "pending" && it.status !== "pending") return false;
              if (filter === "approved" && it.status !== "approved") return false;
              if (filter === "all" && it.status === "rejected") return false;
              if (search.trim()) return it.body.toLowerCase().includes(search.toLowerCase());
              return true;
            });
            const counts = {
              pending: all.filter((i) => i.status === "pending").length,
              approved: all.filter((i) => i.status === "approved").length,
              rejected: all.filter((i) => i.status === "rejected").length,
            };
            return (
              <div key={d.id} className="rounded-md border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedDocId(expanded ? null : d.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30"
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-[#C6A332]" /> : <ChevronRight className="w-4 h-4 text-[#C6A332]" />}
                  <span className="text-[#C6A332]">{kindIcon(d.kind)}</span>
                  <span className="font-medium text-white flex-1">{d.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {counts.approved} kept · {counts.pending} pending · {counts.rejected} removed
                  </span>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-[#C6A332]"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteDoc(d.id); }}
                    className="text-muted-foreground hover:text-red-400"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border/60 pt-3">
                    {d.body && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.body}</p>
                    )}

                    <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                      {visible.length === 0 && (
                        <p className="text-xs text-muted-foreground py-3 text-center italic">
                          {filter === "pending" ? "Nothing pending here." : filter === "approved" ? "Nothing kept yet." : "Nothing here."}
                        </p>
                      )}
                      {visible.map((it) => (
                        <div
                          key={it.id}
                          className={`group flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                            it.status === "approved"
                              ? "border-emerald-700/40 bg-emerald-700/5"
                              : it.status === "rejected"
                              ? "border-red-700/40 bg-red-700/5 opacity-60"
                              : "border-border bg-background/40"
                          }`}
                        >
                          {editingItemId === it.id ? (
                            <Textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onBlur={() => saveEdit(it)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(it); }
                                if (e.key === "Escape") { setEditingItemId(null); }
                              }}
                              autoFocus
                              rows={2}
                              className="flex-1 text-sm min-h-[60px] bg-background"
                            />
                          ) : (
                            <p
                              className="flex-1 whitespace-pre-wrap leading-relaxed cursor-text"
                              onClick={() => startEdit(it)}
                              title="Click to edit"
                            >
                              {it.body}
                            </p>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(it)}
                              title="Edit"
                              className="w-7 h-7 rounded-md text-muted-foreground hover:text-[#C6A332] hover:bg-muted/40 flex items-center justify-center"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {it.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => decide(it, "approved")}
                                  title="Keep forever"
                                  className="w-7 h-7 rounded-md bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => decide(it, "rejected")}
                                  title="Remove forever"
                                  className="w-7 h-7 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => resetItem(it)}
                                title="Reset to pending"
                                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-2 py-1"
                              >
                                Undo
                              </button>
                            )}
                            <button
                              onClick={() => deleteItem(it)}
                              title="Delete"
                              className="w-7 h-7 rounded-md text-muted-foreground hover:text-red-400 hover:bg-muted/40 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex gap-2">
                      <Input
                        value={newItemBody[d.id] ?? ""}
                        onChange={(e) => setNewItemBody((p) => ({ ...p, [d.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(d.id); } }}
                        placeholder="Add your own line, saved as kept"
                        className="h-9 text-sm"
                      />
                      <Button size="sm" onClick={() => addItem(d.id)} disabled={!(newItemBody[d.id] ?? "").trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add resource</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <div className="flex gap-2 mt-1">
                {(["doc", "resource", "tool"] as DocKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setNewDoc({ ...newDoc, kind: k })}
                    className={`px-3 py-1.5 rounded-md text-xs capitalize border ${newDoc.kind === k ? "border-[#C6A332] bg-[#C6A332]/10 text-[#C6A332]" : "border-border text-muted-foreground"}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description (optional)</label>
              <Textarea value={newDoc.body} onChange={(e) => setNewDoc({ ...newDoc, body: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Link (optional)</label>
              <Input value={newDoc.url} onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })} placeholder="https://" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={createDoc} className="bg-[#C6A332] text-black hover:bg-[#C6A332]/90">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-2 text-[#C6A332] font-semibold">
            <Wrench className="w-5 h-5" /> Outreach tools and resources
          </h3>
          {onOpenChange && (
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          )}
        </div>
        {body}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-[#C6A332]">
            <Wrench className="w-5 h-5" /> Outreach tools and resources
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">{body}</div>
      </DialogContent>
    </Dialog>
  );
}