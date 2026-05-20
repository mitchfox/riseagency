import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MessageSquare, Send, FileText, Workflow as WorkflowIcon, StickyNote, Star } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Kind = "note" | "script" | "workflow";
interface Item {
  id: string; kind: Kind; title: string | null; body: string | null;
  metadata: any; status: string; author_label: string | null;
  created_by_admin: boolean; created_at: string;
}
interface Reply {
  id: string; item_id: string; author_label: string | null;
  body_text: string | null; audio_url: string | null;
  is_admin: boolean; created_at: string;
}
interface Template { id: string; message_title: string; message_content: string; recipient_type: string | null; }

export const ExecutiveSupport = ({ kind, token, isAdmin, unlocked }: { kind: Kind; token: string; isAdmin: boolean; unlocked: boolean }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newBody, setNewBody] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [authorLabel, setAuthorLabel] = useState(() => localStorage.getItem("exec_author_label") || "");

  const load = async () => {
    const { data: it } = await (supabase as any).from("exec_support_items").select("*").eq("kind", kind).order("created_at", { ascending: false });
    const list = (it as Item[]) || [];
    setItems(list);
    if (list.length > 0) {
      const { data: rp } = await (supabase as any).from("exec_support_replies").select("*").in("item_id", list.map(i => i.id)).order("created_at");
      setReplies((rp as Reply[]) || []);
    } else setReplies([]);
  };
  useEffect(() => { load(); }, [kind]);

  const call = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("investor-overview-write", { body: { token, action, payload } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Save failed"); return false; }
    await load();
    return true;
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

  const Icon = kind === "note" ? StickyNote : kind === "script" ? FileText : WorkflowIcon;
  const canCreate = kind === "note" ? true : isAdmin;

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
        {items.map((it) => {
          const itemReplies = replies.filter(r => r.item_id === it.id);
          return <ItemCard key={it.id} item={it} replies={itemReplies} unlocked={unlocked} isAdmin={isAdmin} onReply={(t, setter) => reply(it.id, t, setter)} onDelete={isAdmin && unlocked ? async () => { await call("deleteExecItem", { id: it.id }); } : undefined} />;
        })}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-6 text-center col-span-full">No {kind === "note" ? "thoughts" : kind + "s"} yet.</div>
        )}
      </div>

      {kind === "script" && <FavouriteTemplates />}
    </div>
  );
};

const ItemCard = ({ item, replies, isAdmin, unlocked, onReply, onDelete }: { item: Item; replies: Reply[]; isAdmin: boolean; unlocked: boolean; onReply: (t: string, setter: (s: string) => void) => void; onDelete?: () => void }) => {
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
      {replies.length > 0 && (
        <div className="mt-1 space-y-1.5 border-t border-border pt-2">
          {replies.map(r => (
            <div key={r.id} className="rounded bg-card/50 px-2 py-1.5">
              {r.body_text && <div className="text-xs whitespace-pre-wrap">{r.body_text}</div>}
              {r.audio_url && <audio controls src={r.audio_url} className="w-full h-7 mt-1" />}
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{r.author_label || (r.is_admin ? "Admin" : "Investor")} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input placeholder="Reply…" value={text} onChange={(e) => setText(e.target.value)} className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onReply(text, setText); } }} />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onReply(text, setText)}><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
};

const FavouriteTemplates = () => {
  const [rows, setRows] = useState<Template[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("marketing_templates")
        .select("id, message_title, message_content, recipient_type")
        .eq("show_on_investor_portal", true)
        .order("message_title");
      setRows((data as Template[]) || []);
    })();
  }, []);
  if (rows.length === 0) return null;
  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-primary">
        <Star className="h-3.5 w-3.5" /> How we present in conversations
      </div>
      <p className="text-xs text-muted-foreground">A small selection of our staff message templates, kept here so you can feel how we open and run conversations.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(t => (
          <div key={t.id} className="rounded border border-border bg-card/40 p-2.5">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-primary" /> {t.message_title}
            </div>
            {t.recipient_type && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{t.recipient_type}</div>}
            <div className="text-xs whitespace-pre-wrap mt-1.5">{t.message_content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};