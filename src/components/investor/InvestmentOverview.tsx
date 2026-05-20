import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, Plus, Trash2, Check, X, GripVertical, Image as ImageIcon, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface OverviewMetric { label: string; value: string; unit?: string }
export interface DetailBlock {
  kind: "heading" | "paragraph" | "image" | "bullets" | "stat";
  text?: string;
  url?: string;
  alt?: string;
  items?: string[];
  label?: string;
  value?: string;
}
export interface OverviewCardData {
  id: string;
  section_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  metrics: OverviewMetric[];
  tags: string[];
  display_order: number;
  image_url?: string | null;
  image_alt?: string | null;
  detail_blocks?: DetailBlock[];
}
export interface OverviewSectionData {
  id: string;
  title: string;
  display_order: number;
}

interface Props {
  sections: OverviewSectionData[];
  cards: OverviewCardData[];
  unlocked: boolean;
  token: string | null;
  onRefresh: () => Promise<void> | void;
}

async function callWrite(token: string | null, action: string, payload: any) {
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("investor-overview-write", {
    body: { token, action, payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

const MetricChip = ({ m, large }: { m: OverviewMetric; large?: boolean }) => (
  <div
    className={`relative flex flex-col items-start rounded-xl border border-primary/30 bg-white/[0.04] backdrop-blur-md shadow-[0_4px_18px_rgba(0,0,0,0.25)] overflow-hidden ${large ? "px-5 py-4 min-w-[140px]" : "px-3 py-2 min-w-[110px]"}`}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60" />
    <div className={`relative tracking-wider uppercase text-primary/70 font-medium leading-none ${large ? "text-[11px]" : "text-[9px]"}`}>{m.label}</div>
    <div className={`relative text-primary leading-tight font-semibold mt-1.5 tabular-nums ${large ? "text-3xl" : "text-base"}`}>
      {m.value}
      {m.unit ? <span className={`text-primary/70 ml-1 ${large ? "text-sm" : "text-[10px]"}`}>{m.unit}</span> : null}
    </div>
  </div>
);

const DetailBlocksView = ({ blocks }: { blocks: DetailBlock[] }) => {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.kind === "heading") return <h4 key={i} className="text-base md:text-lg font-semibold tracking-tight text-foreground">{b.text}</h4>;
        if (b.kind === "paragraph") return <p key={i} className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{b.text}</p>;
        if (b.kind === "bullets") return (
          <div key={i} className="rounded-xl border border-primary/20 bg-white/[0.03] backdrop-blur-sm p-4 shadow-[0_4px_18px_rgba(0,0,0,0.2)]">
            <ul className="space-y-2 text-sm text-foreground/85">
              {(b.items || []).filter(Boolean).map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="leading-relaxed">{it}</span>
                </li>
              ))}
            </ul>
          </div>
        );
        if (b.kind === "stat") return (
          <div key={i} className="relative inline-flex flex-col items-start rounded-xl border border-primary/30 bg-white/[0.05] backdrop-blur-md px-5 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="relative text-[11px] uppercase tracking-wider text-primary/70 font-medium">{b.label}</div>
            <div className="relative text-2xl text-primary font-semibold mt-1 tabular-nums">{b.value}</div>
          </div>
        );
        if (b.kind === "image" && b.url) return (
          <figure key={i} className="rounded-lg overflow-hidden border border-border bg-black/40">
            <img src={b.url} alt={b.alt || ""} className="w-full max-h-[520px] object-contain" />
            {b.alt && <figcaption className="text-xs text-muted-foreground px-3 py-2 bg-muted/30">{b.alt}</figcaption>}
          </figure>
        );
        return null;
      })}
    </div>
  );
};

const CardEditor = ({ card, sections, token, onDone, onCancel }: {
  card: Partial<OverviewCardData>;
  sections: OverviewSectionData[];
  token: string | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState(card.title || "");
  const [summary, setSummary] = useState(card.summary || "");
  const [content, setContent] = useState(card.content || "");
  const [section_id, setSectionId] = useState(card.section_id || sections[0]?.id || "");
  const [metrics, setMetrics] = useState<OverviewMetric[]>(card.metrics || []);
  const [tags, setTags] = useState<string>(((card.tags) || []).join(", "));
  const [imageUrl, setImageUrl] = useState<string>(card.image_url || "");
  const [imageAlt, setImageAlt] = useState<string>(card.image_alt || "");
  const [blocks, setBlocks] = useState<DetailBlock[]>(card.detail_blocks || []);
  const [uploading, setUploading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return null; }
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const base64 = btoa(binary);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const res: any = await callWrite(token, "uploadImage", {
        base64, contentType: file.type || "image/jpeg", ext,
      });
      return res?.url || null;
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    }
  };

  const handleHeroPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setImageUrl(url);
    e.target.value = "";
  };

  const updateBlock = (i: number, patch: Partial<DetailBlock>) =>
    setBlocks(prev => prev.map((b, j) => j === i ? { ...b, ...patch } : b));
  const removeBlock = (i: number) => setBlocks(prev => prev.filter((_, j) => j !== i));
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks(prev => {
    const next = [...prev]; const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const save = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await callWrite(token, "upsertCard", {
        id: card.id, section_id, title, summary, content,
        metrics: metrics.filter(m => m.label && m.value),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        display_order: card.display_order ?? 999,
        image_url: imageUrl.trim() || null,
        image_alt: imageAlt.trim() || null,
        detail_blocks: blocks,
      });
      toast.success("Saved");
      onDone();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 p-4 border border-primary/40 rounded-md bg-primary/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title" />
        <select value={section_id || ""} onChange={e => setSectionId(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="One-line summary (shown collapsed)" />
      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Full expanded content" rows={5} />

      <div className="space-y-2 border-t border-primary/15 pt-3">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> Hero image (shown at the top of the expanded card)
        </div>
        {imageUrl && (
          <div className="relative rounded-md overflow-hidden border border-border">
            <img src={imageUrl} alt={imageAlt || title} className="w-full max-h-56 object-cover" />
            <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => setImageUrl("")}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL or upload" className="flex-1" />
          <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroPick} />
          <Button size="sm" variant="outline" onClick={() => heroInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {imageUrl && (
          <Input value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="Image alt text (accessibility)" />
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">KPI metrics</div>
        {metrics.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input className="flex-1" value={m.label} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], label: e.target.value }; setMetrics(c); }} placeholder="Label" />
            <Input className="w-32" value={m.value} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], value: e.target.value }; setMetrics(c); }} placeholder="Value" />
            <Input className="w-24" value={m.unit || ""} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], unit: e.target.value }; setMetrics(c); }} placeholder="Unit" />
            <Button size="icon" variant="ghost" onClick={() => setMetrics(metrics.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setMetrics([...metrics, { label: "", value: "", unit: "" }])}><Plus className="w-3 h-3 mr-1" />Metric</Button>
      </div>

      <div className="space-y-2 border-t border-primary/15 pt-3">
        <div className="text-xs font-medium text-muted-foreground">Detail blocks (mix-and-match richer content)</div>
        {blocks.map((b, i) => (
          <DetailBlockEditor
            key={i}
            block={b}
            uploadImage={uploadImage}
            onChange={(patch) => updateBlock(i, patch)}
            onRemove={() => removeBlock(i)}
            onMove={(dir) => moveBlock(i, dir)}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { kind: "heading", text: "" }])}><Plus className="w-3 h-3 mr-1" />Heading</Button>
          <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { kind: "paragraph", text: "" }])}><Plus className="w-3 h-3 mr-1" />Paragraph</Button>
          <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { kind: "bullets", items: [""] }])}><Plus className="w-3 h-3 mr-1" />Bullets</Button>
          <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { kind: "stat", label: "", value: "" }])}><Plus className="w-3 h-3 mr-1" />Stat</Button>
          <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { kind: "image", url: "", alt: "" }])}><Plus className="w-3 h-3 mr-1" />Image</Button>
        </div>
      </div>

      <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="tags, comma, separated" />
      <p className="text-[11px] text-muted-foreground">Tip: add the tag <code>featured</code> to render the card as a large, hero-style tile.</p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}><X className="w-4 h-4 mr-1" />Cancel</Button>
        <Button onClick={save} disabled={busy} className="bg-primary text-primary-foreground"><Check className="w-4 h-4 mr-1" />Save</Button>
      </div>
    </div>
  );
};

const DetailBlockEditor = ({ block, uploadImage, onChange, onRemove, onMove }: {
  block: DetailBlock;
  uploadImage: (f: File) => Promise<string | null>;
  onChange: (patch: Partial<DetailBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const url = await uploadImage(f);
    setUploading(false);
    if (url) onChange({ url });
    e.target.value = "";
  };
  return (
    <div className="rounded border border-border/60 bg-background/50 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{block.kind}</span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(-1)}><ArrowUp className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(1)}><ArrowDown className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
      {block.kind === "heading" && (
        <Input value={block.text || ""} onChange={e => onChange({ text: e.target.value })} placeholder="Section heading" />
      )}
      {block.kind === "paragraph" && (
        <Textarea value={block.text || ""} onChange={e => onChange({ text: e.target.value })} placeholder="Paragraph text" rows={3} />
      )}
      {block.kind === "bullets" && (
        <div className="space-y-1">
          {(block.items || []).map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={e => {
                const items = [...(block.items || [])]; items[i] = e.target.value;
                onChange({ items });
              }} placeholder={`Bullet ${i + 1}`} />
              <Button size="icon" variant="ghost" onClick={() => {
                const items = (block.items || []).filter((_, j) => j !== i);
                onChange({ items });
              }}><X className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => onChange({ items: [...(block.items || []), ""] })}>
            <Plus className="w-3 h-3 mr-1" />Add bullet
          </Button>
        </div>
      )}
      {block.kind === "stat" && (
        <div className="flex gap-2">
          <Input value={block.label || ""} onChange={e => onChange({ label: e.target.value })} placeholder="Stat label" />
          <Input value={block.value || ""} onChange={e => onChange({ value: e.target.value })} placeholder="Stat value" />
        </div>
      )}
      {block.kind === "image" && (
        <div className="space-y-2">
          {block.url && <img src={block.url} alt={block.alt || ""} className="w-full max-h-48 object-cover rounded" />}
          <div className="flex gap-2">
            <Input value={block.url || ""} onChange={e => onChange({ url: e.target.value })} placeholder="Image URL" className="flex-1" />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "…" : "Upload"}
            </Button>
          </div>
          <Input value={block.alt || ""} onChange={e => onChange({ alt: e.target.value })} placeholder="Alt text" />
        </div>
      )}
    </div>
  );
};

const OverviewCard = ({ card, idx, unlocked, sections, token, onChanged }: {
  card: OverviewCardData;
  idx: number;
  unlocked: boolean;
  sections: OverviewSectionData[];
  token: string | null;
  onChanged: () => Promise<void> | void;
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <CardEditor card={card} sections={sections} token={token}
      onDone={async () => { setEditing(false); await onChanged(); }}
      onCancel={() => setEditing(false)} />;
  }

  const del = async () => {
    if (!confirm(`Delete "${card.title}"?`)) return;
    try { await callWrite(token, "deleteCard", { id: card.id }); toast.success("Deleted"); await onChanged(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const isFeatured = (card.tags || []).some(t => t.toLowerCase() === "featured" || t.toLowerCase() === "large");

  if (isFeatured) {
    return (
      <motion.div layout initial={false}
        className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card shadow-lg hover:border-primary/60 transition-colors col-span-full">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 55%)" }} />
        {card.image_url && (
          <div className="relative w-full bg-black/40 flex items-center justify-center">
            <img
              src={card.image_url}
              alt={card.image_alt || card.title}
              className="w-full h-auto max-h-[560px] object-contain"
            />
          </div>
        )}
        <div className="relative p-6 md:p-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] tracking-widest text-primary/80 font-medium mb-1">Featured</div>
              <div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-tight">{card.title}</div>
              {card.summary && <div className="text-sm md:text-base text-foreground/70 mt-2 leading-relaxed max-w-2xl font-sans normal-case tracking-normal">{card.summary}</div>}
            </div>
            {unlocked && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={del}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </div>
          {card.content && (
            <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap border-t border-primary/15 pt-4 font-sans normal-case tracking-normal">{card.content}</div>
          )}
          {card.detail_blocks && card.detail_blocks.length > 0 && (
            <div className="border-t border-primary/15 pt-4">
              <DetailBlocksView blocks={card.detail_blocks} />
            </div>
          )}
          {card.metrics?.length > 0 && (
            <div className="border-t border-primary/15 pt-5">
              <div className="text-[11px] uppercase tracking-widest text-primary/70 font-medium mb-3">Key metrics</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {card.metrics.map((m, i) => <MetricChip key={i} m={m} large />)}
              </div>
            </div>
          )}
          {card.tags?.filter(t => t.toLowerCase() !== "featured" && t.toLowerCase() !== "large").length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.tags.filter(t => t.toLowerCase() !== "featured" && t.toLowerCase() !== "large").map(t => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{t}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={false}
      className="relative overflow-hidden rounded-md border border-primary/20 bg-card hover:border-primary/40 transition-colors">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 text-left px-4 md:px-5 py-4 hover:bg-primary/5 transition-colors"
      >
        {unlocked && <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />}
        <div className="text-2xl md:text-3xl text-primary/60 font-semibold leading-none w-9 shrink-0 tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base md:text-lg tracking-tight text-foreground leading-tight">{card.title}</div>
          {card.summary && <div className="text-sm text-foreground/60 mt-1 leading-snug font-sans normal-case tracking-normal">{card.summary}</div>}
          {card.metrics?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 md:hidden">
              {card.metrics.map((m, i) => <MetricChip key={i} m={m} />)}
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-wrap gap-2 justify-end max-w-[40%] shrink-0">
          {card.metrics?.map((m, i) => <MetricChip key={i} m={m} />)}
        </div>
        <ChevronDown className={`w-5 h-5 text-primary mt-1 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-primary/10">
            <div className="px-4 md:px-5 py-5 space-y-4">
              {card.image_url && (
                <figure className="rounded-md overflow-hidden border border-border bg-black/40 flex items-center justify-center">
                  <img src={card.image_url} alt={card.image_alt || card.title} className="w-full max-h-[520px] object-contain" />
                </figure>
              )}
              {card.content && (
                <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-sans normal-case tracking-normal">{card.content}</div>
              )}
              {card.detail_blocks && card.detail_blocks.length > 0 && (
                <DetailBlocksView blocks={card.detail_blocks} />
              )}
              {card.metrics?.length > 0 && (
                <div className="border-t border-primary/10 pt-4">
                  <div className="text-[11px] uppercase tracking-widest text-primary/70 font-medium mb-3">Key metrics</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {card.metrics.map((m, i) => <MetricChip key={i} m={m} large />)}
                  </div>
                </div>
              )}
              {card.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.map(t => (
                    <span key={t} className="text-[11px] tracking-normal px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {unlocked && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); del(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </motion.div>
  );
};

export const InvestmentOverview = ({ sections, cards, unlocked, token, onRefresh }: Props) => {
  const [adding, setAdding] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const grouped = useMemo(() => sections.map(sec => ({
    section: sec,
    cards: cards.filter(c => c.section_id === sec.id).sort((a, b) => a.display_order - b.display_order),
  })), [sections, cards]);

  const orphan = cards.filter(c => !sections.find(s => s.id === c.section_id));

  return (
    <div className="space-y-8 font-sans normal-case tracking-normal">
      {grouped.map(({ section, cards: list }) => (
        <div key={section.id} className="space-y-3">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{section.title}</h3>
            {unlocked && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                  const t = prompt("Rename section", section.title); if (!t || t === section.title) return;
                  try { await callWrite(token, "upsertSection", { id: section.id, title: t, display_order: section.display_order }); await onRefresh(); }
                  catch (e: any) { toast.error(e.message); }
                }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => {
                  if (!confirm(`Delete section "${section.title}" and all its cards?`)) return;
                  try { await callWrite(token, "deleteSection", { id: section.id }); await onRefresh(); }
                  catch (e: any) { toast.error(e.message); }
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {list.map((c, i) => (
              <OverviewCard key={c.id} card={c} idx={i} unlocked={unlocked} sections={sections} token={token} onChanged={onRefresh} />
            ))}
            {adding === section.id && (
              <CardEditor
                card={{ section_id: section.id, metrics: [], tags: [], display_order: (list[list.length - 1]?.display_order ?? 0) + 1 }}
                sections={sections} token={token}
                onDone={async () => { setAdding(null); await onRefresh(); }}
                onCancel={() => setAdding(null)}
              />
            )}
            {unlocked && adding !== section.id && (
              <Button size="sm" variant="outline" className="w-full border-dashed" onClick={() => setAdding(section.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add card to {section.title}
              </Button>
            )}
          </div>
        </div>
      ))}

      {orphan.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight text-muted-foreground">Other</h3>
          {orphan.map((c, i) => (
            <OverviewCard key={c.id} card={c} idx={i} unlocked={unlocked} sections={sections} token={token} onChanged={onRefresh} />
          ))}
        </div>
      )}

      {unlocked && (
        <div className="border-t border-primary/10 pt-4">
          {addingSection ? (
            <div className="flex gap-2">
              <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Section title" autoFocus />
              <Button onClick={async () => {
                if (!newSectionTitle.trim()) return;
                try { await callWrite(token, "upsertSection", { title: newSectionTitle, display_order: (sections[sections.length - 1]?.display_order ?? 0) + 1 }); setNewSectionTitle(""); setAddingSection(false); await onRefresh(); }
                catch (e: any) { toast.error(e.message); }
              }} className="bg-primary text-primary-foreground"><Check className="w-4 h-4" /></Button>
              <Button variant="ghost" onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-dashed" onClick={() => setAddingSection(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add section
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

