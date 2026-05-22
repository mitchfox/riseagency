import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Share2, ExternalLink } from "lucide-react";

interface SeoOverride {
  id: string;
  path: string;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  is_active: boolean;
}

const empty = (): SeoOverride => ({
  id: "new",
  path: "/",
  og_title: "",
  og_description: "",
  og_image_url: "",
  is_active: true,
});

export const SocialShareManagement = () => {
  const [rows, setRows] = useState<SeoOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SeoOverride | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_overrides")
      .select("id, path, og_title, og_description, og_image_url, is_active")
      .order("path", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as SeoOverride[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (row: SeoOverride) => {
    if (!row.path?.trim()) { toast.error("Path is required"); return; }
    const payload = {
      path: row.path.trim(),
      og_title: row.og_title || null,
      og_description: row.og_description || null,
      og_image_url: row.og_image_url || null,
      is_active: row.is_active,
    };
    const op = row.id === "new"
      ? supabase.from("seo_overrides").insert(payload)
      : supabase.from("seo_overrides").update(payload).eq("id", row.id);
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    toast.success("Social share override saved");
    setDraft(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this override?")) return;
    const { error } = await supabase.from("seo_overrides").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const Editor = ({ row, onChange, onSave, onCancel }: {
    row: SeoOverride;
    onChange: (r: SeoOverride) => void;
    onSave: () => void;
    onCancel: () => void;
  }) => (
    <div className="grid gap-3 p-4 rounded-md border border-border bg-muted/20">
      <div className="grid gap-1.5">
        <Label>Path</Label>
        <Input
          value={row.path}
          onChange={e => onChange({ ...row, path: e.target.value })}
          placeholder="/jobs/head-of-scouting"
        />
        <p className="text-xs text-muted-foreground">Relative path on the site, e.g. <code>/jobs/talent-scout</code>.</p>
      </div>
      <div className="grid gap-1.5">
        <Label>Social title</Label>
        <Input
          value={row.og_title || ""}
          onChange={e => onChange({ ...row, og_title: e.target.value })}
          placeholder="We're hiring a Talent Scout — RISE"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Social description</Label>
        <Textarea
          rows={3}
          value={row.og_description || ""}
          onChange={e => onChange({ ...row, og_description: e.target.value })}
          placeholder="One concise sentence that previews well on WhatsApp, LinkedIn and X."
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Image URL (1200×630 ideal)</Label>
        <Input
          value={row.og_image_url || ""}
          onChange={e => onChange({ ...row, og_image_url: e.target.value })}
          placeholder="https://..."
        />
        {row.og_image_url && (
          <img src={row.og_image_url} alt="Preview" className="mt-2 rounded border border-border max-h-40 object-cover" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={row.is_active} onCheckedChange={v => onChange({ ...row, is_active: v })} />
        <Label className="!m-0">Active</Label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" /> Social Share</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Override the title, description and image shown when any page is shared on WhatsApp, LinkedIn, X and other platforms.
            </p>
          </div>
          {!draft && (
            <Button onClick={() => setDraft(empty())}>
              <Plus className="w-4 h-4 mr-1" /> New override
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft && (
          <Editor
            row={draft}
            onChange={setDraft}
            onSave={() => save(draft)}
            onCancel={() => setDraft(null)}
          />
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overrides yet. Add one to control how a specific page previews on social.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <a
                        href={r.path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate inline-flex items-center gap-1"
                      >
                        {r.path}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {!r.is_active && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          Inactive
                        </span>
                      )}
                    </div>
                    {r.og_title && <div className="text-sm mt-1 font-medium truncate">{r.og_title}</div>}
                    {r.og_description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.og_description}</div>}
                  </div>
                  {r.og_image_url && (
                    <img src={r.og_image_url} alt="" className="w-24 h-14 object-cover rounded border border-border shrink-0" />
                  )}
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => setDraft(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};