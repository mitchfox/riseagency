import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, Upload, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type ParsedItem = { date: string; start_time: string; end_time: string; title: string };
type StaffOption = { id: string; full_name: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onImported: () => void;
}

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    const comma = result.indexOf(",");
    resolve(comma >= 0 ? result.slice(comma + 1) : result);
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export const AiScheduleImportDialog = ({ open, onOpenChange, currentUserId, onImported }: Props) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [targetId, setTargetId] = useState<string>(currentUserId);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ParsedItem[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTargetId(currentUserId);
    setRows([]);
    setText("");
    setImageFile(null);
    setImagePreview(null);
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open || !currentUserId) return;
    (async () => {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!roleRow;
      setIsAdmin(admin);
      if (admin) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["admin", "staff"]);
        const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          const opts = (profs || [])
            .map((p: any) => ({ id: p.id, full_name: p.full_name || "Unnamed" }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name));
          setStaff(opts);
        }
      }
    })();
  }, [open, currentUserId]);

  const onPickImage = async (file: File | null) => {
    setImageFile(file);
    if (!file) { setImagePreview(null); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const parse = async () => {
    if (mode === "text" && !text.trim()) { toast.error("Paste some text first"); return; }
    if (mode === "image" && !imageFile) { toast.error("Choose an image first"); return; }
    setParsing(true);
    try {
      const payload: any = {
        mode,
        referenceDate: new Date().toISOString().slice(0, 10),
      };
      if (mode === "text") payload.text = text;
      else if (imageFile) {
        payload.imageBase64 = await fileToBase64(imageFile);
        payload.imageMime = imageFile.type || "image/jpeg";
      }
      const { data, error } = await supabase.functions.invoke("parse-schedule-ai", { body: payload });
      if (error) throw error;
      const items: ParsedItem[] = (data?.items || []) as ParsedItem[];
      if (!items.length) { toast.error("AI could not find any schedule items"); }
      else { toast.success(`Found ${items.length} item${items.length === 1 ? "" : "s"}`); }
      setRows(items);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "AI parsing failed");
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (i: number, patch: Partial<ParsedItem>) => {
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!rows.length) { toast.error("Nothing to add"); return; }
    if (!targetId) { toast.error("Choose a staff member"); return; }
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        user_id: targetId,
        title: r.title.trim(),
        scheduled_date: r.date,
        start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
        end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
      }));
      const { error } = await supabase.from("staff_personal_schedule_items").insert(payload);
      if (error) throw error;
      toast.success(`Added ${payload.length} item${payload.length === 1 ? "" : "s"} to the schedule`);
      onImported();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save items");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI schedule import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isAdmin && staff.length > 0 && (
            <div className="space-y-1.5">
              <Label>Add to schedule of</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue placeholder="Choose staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}{s.id === currentUserId ? " (me)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-2">
              <Label>Paste a schedule</Label>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`e.g.\nMon 10:00 Team meeting\nTue 14:30-15:30 Player review\nFri Travel to London 09:00`}
              />
            </TabsContent>
            <TabsContent value="image" className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1.5" /> Upload image
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-1.5" /> Camera / photo
                </Button>
                <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
              </div>
              {imagePreview ? (
                <img src={imagePreview} alt="Selected schedule" className="max-h-64 rounded-md border border-border" />
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> No image selected
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div>
            <Button type="button" onClick={parse} disabled={parsing}>
              {parsing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Parsing…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Parse with AI</>}
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <Label>Review items ({rows.length})</Label>
              <div className="rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                    <Input
                      type="date"
                      value={r.date}
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                      className="col-span-3 h-8 text-xs"
                    />
                    <Input
                      type="time"
                      value={r.start_time.slice(0,5)}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                      className="col-span-2 h-8 text-xs"
                    />
                    <Input
                      type="time"
                      value={r.end_time.slice(0,5)}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                      className="col-span-2 h-8 text-xs"
                    />
                    <Input
                      value={r.title}
                      onChange={(e) => updateRow(i, { title: e.target.value })}
                      className="col-span-4 h-8 text-xs"
                    />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || rows.length === 0}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Adding…</> : `Add ${rows.length || ""} to schedule`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiScheduleImportDialog;