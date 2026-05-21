import { useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Send, X } from "lucide-react";

interface JobApplyFormProps {
  jobId: string;
  jobSlug: string;
  jobTitle: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  link: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

const MAX_CV_MB = 10;
const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function JobApplyForm({ jobId, jobSlug, jobTitle }: JobApplyFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [cv, setCv] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", link: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const handleFile = (file: File | null) => {
    if (!file) {
      setCv(null);
      return;
    }
    if (file.size > MAX_CV_MB * 1024 * 1024) {
      toast.error(`CV must be under ${MAX_CV_MB} MB`);
      return;
    }
    if (!CV_TYPES.includes(file.type) && !/\.(pdf|docx?|DOC|PDF|DOCX)$/.test(file.name)) {
      toast.error("CV must be PDF or Word document");
      return;
    }
    setCv(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof typeof form, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the errors above");
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      let cvPath: string | null = null;
      let cvUrl: string | null = null;
      let cvFilename: string | null = null;

      if (cv) {
        const safeName = cv.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${jobSlug}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("job-applications")
          .upload(path, cv, { upsert: false, contentType: cv.type || undefined });
        if (upErr) throw upErr;
        cvPath = path;
        cvFilename = cv.name;
        const { data: pub } = supabase.storage.from("job-applications").getPublicUrl(path);
        cvUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("form_submissions").insert({
        form_type: "job_application",
        data: {
          job_id: jobId,
          job_slug: jobSlug,
          job_title: jobTitle,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          link: parsed.data.link || null,
          message: parsed.data.message || null,
          cv_path: cvPath,
          cv_url: cvUrl,
          cv_filename: cvFilename,
        },
      });
      if (error) throw error;

      setDone(true);
      toast.success("Application sent");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card/50 p-8 text-center backdrop-blur-sm">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="font-bebas text-2xl uppercase tracking-wider">Application received</h3>
        <p className="mt-2 text-muted-foreground">
          Thanks for applying for <span className="text-foreground">{jobTitle}</span>. We review every application and will be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name *</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 7..." />
        </div>
        <div>
          <Label htmlFor="link">LinkedIn / portfolio</Label>
          <Input id="link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://linkedin.com/in/..." />
          {errors.link && <p className="mt-1 text-xs text-destructive">{errors.link}</p>}
        </div>
      </div>

      <div>
        <Label>CV (PDF or Word, optional, max {MAX_CV_MB} MB)</Label>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
        {cv ? (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="truncate">{cv.name}</span>
            <button type="button" onClick={() => { setCv(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <FileUp className="h-4 w-4" /> Upload CV
          </Button>
        )}
      </div>

      <div>
        <Label htmlFor="message">Cover letter / message (optional)</Label>
        <Textarea
          id="message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us why you'd be a great fit..."
        />
      </div>

      <Button type="submit" disabled={submitting} className="btn-shine w-full font-bebas uppercase tracking-wider md:w-auto">
        <Send className="mr-2 h-4 w-4" />
        {submitting ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}