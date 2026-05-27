import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Repeat, Image as ImageIcon, ClipboardList, Upload, X } from "lucide-react";

export type ScheduleItem = {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  notes: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  recurring_weekly?: boolean;
  recurrence_group_id?: string | null;
  image_url?: string | null;
  done_at?: string | null;
};

interface Props {
  item: ScheduleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: ScheduleItem, opts?: { recurrenceChanged?: boolean }) => void;
  onDeleted: (id: string, opts?: { allFuture?: boolean; groupId?: string | null; fromDate?: string }) => void;
  onLogToTasks: (item: ScheduleItem) => void;
}

const trim5 = (s: string) => (s || "").slice(0, 5);

export const TaskDetailDialog = ({ item, open, onOpenChange, onSaved, onDeleted, onLogToTasks }: Props) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title || "");
    setNotes(item.notes || "");
    setDate(item.scheduled_date);
    setStart(trim5(item.start_time));
    setEnd(trim5(item.end_time));
    setImageUrl(item.image_url || "");
    setRecurring(!!item.recurring_weekly);
  }, [item]);

  if (!item) return null;

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const recurrenceChanged = !!item.recurring_weekly !== recurring;
      const updates: any = {
        title: title.trim() || "Untitled",
        notes: notes || null,
        scheduled_date: date,
        start_time: start + ":00",
        end_time: end + ":00",
        image_url: imageUrl.trim() || null,
      };

      // Persist core fields
      const { error } = await supabase
        .from("staff_personal_schedule_items")
        .update(updates)
        .eq("id", item.id);
      if (error) throw error;

      // Handle recurrence toggle
      let updated: ScheduleItem = { ...item, ...updates };

      if (recurrenceChanged) {
        if (recurring) {
          // Enable: clone forward 11 weeks
          const groupId = item.recurrence_group_id || item.id;
          await supabase
            .from("staff_personal_schedule_items")
            .update({ recurring_weekly: true, recurrence_group_id: groupId })
            .eq("id", item.id);
          const baseDate = new Date(date + "T00:00:00");
          const clones = Array.from({ length: 11 }, (_, i) => {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + (i + 1) * 7);
            return {
              user_id: item.user_id,
              task_id: item.task_id,
              title: updates.title,
              notes: updates.notes,
              scheduled_date: fmtDate(d),
              start_time: updates.start_time,
              end_time: updates.end_time,
              recurring_weekly: true,
              recurrence_group_id: groupId,
              image_url: updates.image_url,
            };
          });
          await supabase.from("staff_personal_schedule_items").insert(clones);
          updated = { ...updated, recurring_weekly: true, recurrence_group_id: groupId };
        } else {
          // Disable: remove future siblings, unmark this one
          const groupId = item.recurrence_group_id;
          if (groupId) {
            await supabase
              .from("staff_personal_schedule_items")
              .delete()
              .eq("recurrence_group_id", groupId)
              .gt("scheduled_date", date);
          }
          await supabase
            .from("staff_personal_schedule_items")
            .update({ recurring_weekly: false })
            .eq("id", item.id);
          updated = { ...updated, recurring_weekly: false };
        }
      }

      toast.success("Saved");
      onSaved(updated, { recurrenceChanged });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allFuture: boolean) => {
    if (!item) return;
    const groupId = item.recurrence_group_id;
    try {
      if (allFuture && groupId) {
        const { error } = await supabase
          .from("staff_personal_schedule_items")
          .delete()
          .eq("recurrence_group_id", groupId)
          .gte("scheduled_date", item.scheduled_date);
        if (error) throw error;
        onDeleted(item.id, { allFuture: true, groupId, fromDate: item.scheduled_date });
      } else {
        const { error } = await supabase
          .from("staff_personal_schedule_items")
          .delete()
          .eq("id", item.id);
        if (error) throw error;
        onDeleted(item.id);
      }
      toast.success("Deleted");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const isRecurring = !!item.recurring_weekly && !!item.recurrence_group_id;

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${item.user_id}/${item.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("schedule-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("schedule-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="task-date">Date</Label>
              <Input id="task-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-start">Start</Label>
              <Input id="task-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-end">End</Label>
              <Input id="task-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-background/50 hover:bg-background/70 cursor-pointer text-sm">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : (imageUrl ? "Replace image" : "Upload image")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }}
                />
              </label>
              {imageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setImageUrl("")} title="Remove image">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {imageUrl && (
              <div className="h-24 w-full rounded-md bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${imageUrl})` }} />
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">Repeat weekly</div>
                <div className="text-xs text-muted-foreground">When enabled, this task is cloned for the next 11 weeks.</div>
              </div>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">Log to My Tasks</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onLogToTasks(item)}>Log</Button>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" onClick={() => handleDelete(false)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
            {isRecurring && (
              <Button variant="outline" size="sm" onClick={() => handleDelete(true)}>
                Delete this & all future
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;