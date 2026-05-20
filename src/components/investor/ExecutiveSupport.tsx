import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, FileText, Workflow as WorkflowIcon, StickyNote, CheckCircle2, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

type Kind = "note" | "script" | "workflow";
interface Item {
  id: string; kind: Kind; title: string | null; body: string | null;
  metadata: any; status: string; author_label: string | null;
  created_by_admin: boolean; created_at: string;
  source_type?: string | null; source_id?: string | null;
}
interface Reply {
  id: string; item_id: string; author_label: string | null;
  body_text: string | null; audio_url: string | null;
  is_admin: boolean; created_at: string; status?: string | null;
}
interface Template { id: string; message_title: string; message_content: string; recipient_type: string | null; }
interface Script { id: string; title: string; description: string | null; sort_order?: number | null; }
interface ScriptNode { id: string; script_id: string; parent_node_id: string | null; kind: string; branch_label: string | null; content: string | null; optional: boolean; sort_order: number; }
interface ScriptObjection { id: string; script_id: string; objection: string; response: string | null; sort_order: number; }
interface CaseStudy { id: string; title: string; description: string | null; context_notes: string | null; }
interface StaffTask { id: string; title: string; description: string | null; category: string | null; priority: string | null; completed: boolean; deadline: string | null; assigned_to?: string[] | null; recurrence_label?: string | null; }

type SourceEntry = {
  source_type: "messaging_script" | "marketing_template" | "staff_task";
  source_id: string;
  title: string;
  body: string | null;
  badge: string;
  metadata?: Record<string, any>;
};

export const ExecutiveSupport = ({ kind, token, isAdmin, unlocked, staffTasks = [] }: { kind: Kind; token: string; isAdmin: boolean; unlocked: boolean; staffTasks?: StaffTask[] }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptNodes, setScriptNodes] = useState<ScriptNode[]>([]);
  const [scriptObjections, setScriptObjections] = useState<ScriptObjection[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [newBody, setNewBody] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [authorLabel, setAuthorLabel] = useState(() => localStorage.getItem("exec_author_label") || "");

  const load = async () => {
    const itemQuery = (supabase as any).from("exec_support_items").select("*").eq("kind", kind);
    const { data: it } = kind === "note"
      ? await itemQuery.order("created_at", { ascending: false })
      : await itemQuery.order("created_at", { ascending: false });
    const list = ((it as Item[]) || []).filter((item) => {
      if (kind === "script") return !item.source_type || ["messaging_script", "marketing_template"].includes(item.source_type);
      if (kind === "workflow") return !item.source_type || item.source_type === "staff_task";
      return true;
    });
    setItems(list);
    if (list.length > 0) {
      const { data: rp } = await (supabase as any).from("exec_support_replies").select("*").in("item_id", list.map(i => i.id)).order("created_at");
      setReplies((rp as Reply[]) || []);
    } else setReplies([]);
  };
  const loadSources = async () => {
    if (kind === "script") {
      const [tpl, scr, nd, obj, cs] = await Promise.all([
        (supabase as any).from("marketing_templates").select("id, message_title, message_content, recipient_type").order("message_title"),
        (supabase as any).from("messaging_scripts").select("id, title, description, sort_order").order("sort_order").order("created_at"),
        (supabase as any).from("messaging_script_nodes").select("*").order("sort_order"),
        (supabase as any).from("messaging_script_objections").select("*").order("sort_order"),
        (supabase as any).from("messaging_case_studies").select("id, title, description, context_notes").order("updated_at", { ascending: false }),
      ]);
      setTemplates((tpl.data as Template[]) || []);
      setScripts((scr.data as Script[]) || []);
      setScriptNodes((nd.data as ScriptNode[]) || []);
      setScriptObjections((obj.data as ScriptObjection[]) || []);
      setCaseStudies((cs.data as CaseStudy[]) || []);
    }
  };
  useEffect(() => { load(); loadSources(); }, [kind]);

  const call = async (action: string, payload: any) => {
    const { data, error } = await invokeEdgeFunction("investor-overview-write", { body: { token, action, payload } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Save failed"); return false; }
    await load();
    return true;
  };

  const sourceEntries = useMemo<SourceEntry[]>(() => {
    if (kind === "script") {
      const scriptCards = scripts.map((script) => {
        const nodes = scriptNodes.filter((n) => n.script_id === script.id).sort((a, b) => a.sort_order - b.sort_order);
        const objections = scriptObjections.filter((o) => o.script_id === script.id).sort((a, b) => a.sort_order - b.sort_order);
        const flowText = nodes
          .map((n) => [n.branch_label, n.content].filter(Boolean).join(" - "))
          .filter(Boolean)
          .join("\n\n");
        const objectionText = objections.length
          ? `\n\nCommon objections\n${objections.map((o) => `• ${o.objection}${o.response ? `\n  ${o.response}` : ""}`).join("\n")}`
          : "";
        return {
          source_type: "messaging_script" as const,
          source_id: script.id,
          title: script.title,
          body: [script.description, flowText].filter(Boolean).join("\n\n") + objectionText,
          badge: "Staff script",
          metadata: { node_count: nodes.length, objection_count: objections.length },
        };
      });
      const templateCards = templates.map((template) => ({
        source_type: "marketing_template" as const,
        source_id: template.id,
        title: template.message_title,
        body: template.message_content,
        badge: template.recipient_type || "Message template",
      }));
      return [...scriptCards, ...templateCards];
    }

    if (kind === "workflow") {
      return staffTasks.map((task) => ({
        source_type: "staff_task" as const,
        source_id: task.id,
        title: task.title,
        body: [task.description, task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleDateString("en-GB")}` : null, task.recurrence_label ? `Cadence: ${task.recurrence_label}` : null].filter(Boolean).join("\n"),
        badge: [task.category || "Focused task", task.priority || null, task.completed ? "complete" : "active"].filter(Boolean).join(" • "),
        metadata: { completed: task.completed, category: task.category, priority: task.priority },
      }));
    }

    return [];
  }, [kind, scripts, scriptNodes, scriptObjections, templates, staffTasks]);

  const sourceItems = sourceEntries.map((source) => {
    const feedbackItem = items.find((it) => it.source_type === source.source_type && it.source_id === source.source_id);
    return { source, feedbackItem, feedbackReplies: feedbackItem ? replies.filter((r) => r.item_id === feedbackItem.id) : [] };
  });

  const manualItems = items.filter((item) => !item.source_type);

  const ensureSourceItem = async (source: SourceEntry): Promise<Item | null> => {
    const existing = items.find((it) => it.source_type === source.source_type && it.source_id === source.source_id);
    if (existing) return existing;
    const { data, error } = await invokeEdgeFunction("investor-overview-write", {
      body: { token, action: "ensureExecSourceItem", payload: { kind, ...source } },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not open feedback");
      return null;
    }
    await load();
    return ((data as any)?.row as Item) || null;
  };

  const create = async () => {
    if (!newBody.trim() && !newTitle.trim()) return;
    if (authorLabel) localStorage.setItem("exec_author_label", authorLabel);
    if (kind === "note") {
      await call("postExecNote", { body: newBody.trim(), author_label: authorLabel || undefined });
    } else {
      if (!isAdmin) return; // only admin can create scripts/workflows
      await call("upsertExecItem", { kind, title: newTitle.trim(), body: newBody.trim(), author_label: authorLabel || undefined });
    }
    setNewBody(""); setNewTitle("");
  };

  const reply = async (itemId: string, text: string, setter: (s: string) => void) => {
    if (!text.trim()) return;
    if (authorLabel) localStorage.setItem("exec_author_label", authorLabel);
    const action = isAdmin ? "addExecReply" : "addExecReplyAsInvestor";
    await call(action, { item_id: itemId, body_text: text.trim(), author_label: authorLabel || undefined });
    setter("");
  };

  const replyToSource = async (source: SourceEntry, text: string, setter: (s: string) => void) => {
    if (!text.trim()) return;
    const feedbackItem = await ensureSourceItem(source);
    if (!feedbackItem?.id) return;
    await reply(feedbackItem.id, text, setter);
  };

  const Icon = kind === "note" ? StickyNote : kind === "script" ? FileText : WorkflowIcon;
  const canCreate = kind === "note" ? true : isAdmin && unlocked;

  return (
    <div className="space-y-4">
      {/* Composer */}
      {canCreate && (
        <div className="rounded-lg border border-border bg-card/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span>New {kind}</span>
          </div>
          {kind !== "note" && (
            <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          )}
          <Textarea placeholder={kind === "note" ? "Drop a thought, question, or idea…" : "Body"} rows={3} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
          <div className="flex items-center justify-between gap-2">
            <Input placeholder="Your name (optional)" value={authorLabel} onChange={(e) => setAuthorLabel(e.target.value)} className="h-8 max-w-[200px]" />
            <Button size="sm" onClick={create}><Plus className="h-3.5 w-3.5 mr-1" />Post</Button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className={kind === "note" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-3"}>
        {sourceItems.map(({ source, feedbackItem, feedbackReplies }) => (
          <SourceCard
            key={`${source.source_type}-${source.source_id}`}
            source={source}
            replies={feedbackReplies}
            item={feedbackItem}
            unlocked={unlocked}
            isAdmin={isAdmin}
            onReply={(t, setter) => replyToSource(source, t, setter)}
            onResolveReply={isAdmin && unlocked ? (id, status) => call("updateExecReplyStatus", { id, status }) : undefined}
            onDeleteReply={isAdmin && unlocked ? (id) => call("deleteExecReply", { id }) : undefined}
          />
        ))}
        {manualItems.map((it) => {
          const itemReplies = replies.filter(r => r.item_id === it.id);
          return <ItemCard key={it.id} item={it} replies={itemReplies} unlocked={unlocked} isAdmin={isAdmin} onReply={(t, setter) => reply(it.id, t, setter)} onDelete={isAdmin && unlocked ? async () => { await call("deleteExecItem", { id: it.id }); } : undefined} onResolveReply={isAdmin && unlocked ? (id, status) => call("updateExecReplyStatus", { id, status }) : undefined} onDeleteReply={isAdmin && unlocked ? (id) => call("deleteExecReply", { id }) : undefined} />;
        })}
        {items.length === 0 && sourceItems.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-6 text-center col-span-full">No {kind === "note" ? "thoughts" : kind + "s"} yet.</div>
        )}
      </div>
    </div>
  );
};

const SourceCard = ({ source, item, replies, isAdmin, unlocked, onReply, onResolveReply, onDeleteReply }: { source: SourceEntry; item?: Item; replies: Reply[]; isAdmin: boolean; unlocked: boolean; onReply: (t: string, setter: (s: string) => void) => void; onResolveReply?: (id: string, status: "open" | "resolved") => void; onDeleteReply?: (id: string) => void }) => {
  const [text, setText] = useState("");
  return (
    <div className="rounded-lg border border-border bg-card/30 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{source.title}</h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">{source.badge}</Badge>
            {item?.status === "resolved" && <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">Resolved</Badge>}
          </div>
          {source.body && <div className="text-xs whitespace-pre-wrap text-muted-foreground max-h-56 overflow-auto pr-1">{source.body}</div>}
        </div>
        {source.body && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(source.body || ""); toast.success("Copied"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <FeedbackReplies replies={replies} unlocked={unlocked} isAdmin={isAdmin} onResolveReply={onResolveReply} onDeleteReply={onDeleteReply} />
      <div className="flex items-center gap-1.5 border-t border-border pt-2">
        <Input placeholder="Comment or feedback…" value={text} onChange={(e) => setText(e.target.value)} className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onReply(text, setText); } }} />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onReply(text, setText)}><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
};

const FeedbackReplies = ({ replies, isAdmin, unlocked, onResolveReply, onDeleteReply }: { replies: Reply[]; isAdmin: boolean; unlocked: boolean; onResolveReply?: (id: string, status: "open" | "resolved") => void; onDeleteReply?: (id: string) => void }) => {
  if (replies.length === 0) return null;
  return (
    <div className="mt-1 space-y-1.5 border-t border-border pt-2">
      {replies.map(r => {
        const resolved = r.status === "resolved";
        return (
          <div key={r.id} className={`rounded bg-card/50 px-2 py-1.5 ${resolved ? "opacity-60" : ""}`}>
            {r.body_text && <div className={`text-xs whitespace-pre-wrap ${resolved ? "line-through" : ""}`}>{r.body_text}</div>}
            {r.audio_url && <audio controls src={r.audio_url} className="w-full h-7 mt-1" />}
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{r.author_label || (r.is_admin ? "Admin" : "Investor")} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
              {isAdmin && unlocked && (
                <div className="flex items-center gap-1">
                  {onResolveReply && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onResolveReply(r.id, resolved ? "open" : "resolved")}>
                      {resolved ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    </Button>
                  )}
                  {onDeleteReply && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteReply(r.id)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ItemCard = ({ item, replies, isAdmin, unlocked, onReply, onDelete, onResolveReply, onDeleteReply }: { item: Item; replies: Reply[]; isAdmin: boolean; unlocked: boolean; onReply: (t: string, setter: (s: string) => void) => void; onDelete?: () => void; onResolveReply?: (id: string, status: "open" | "resolved") => void; onDeleteReply?: (id: string) => void }) => {
  const [text, setText] = useState("");
  return (
    <div className="rounded-lg border border-border bg-card/30 p-3 space-y-2">
      {item.title && <div className="text-sm font-semibold">{item.title}</div>}
      {item.body && <div className="text-sm whitespace-pre-wrap">{item.body}</div>}
      {item.metadata?.audio_url && (
        <audio controls src={item.metadata.audio_url} className="w-full h-8" />
      )}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{item.author_label || (item.created_by_admin ? "Admin" : "Investor")} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        )}
      </div>
      <FeedbackReplies replies={replies} unlocked={unlocked} isAdmin={isAdmin} onResolveReply={onResolveReply} onDeleteReply={onDeleteReply} />
      <div className="flex items-center gap-1.5">
        <Input placeholder="Reply…" value={text} onChange={(e) => setText(e.target.value)} className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onReply(text, setText); } }} />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onReply(text, setText)}><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
};
