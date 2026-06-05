import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Briefcase, ExternalLink, Clock, MapPin, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string | null;
  description: string | null;
  type: string | null;
  is_active: boolean;
  created_at: string;
  requirements: string | null;
  responsibilities: string | null;
  salary_range: string | null;
  summary: string | null;
  seo_image_url: string | null;
}

interface JobFormData {
  title: string;
  slug: string;
  department: string;
  location: string;
  description: string;
  type: string;
  is_active: boolean;
  requirements: string;
  responsibilities: string;
  salary_range: string;
  summary: string;
  seo_image_url: string;
}

const defaultFormData: JobFormData = {
  title: "",
  slug: "",
  department: "General",
  location: "",
  description: "",
  type: "Full-time",
  is_active: true,
  requirements: "",
  responsibilities: "",
  salary_range: "",
  summary: "",
  seo_image_url: "",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

export const JobsManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(defaultFormData);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenDialog = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        title: job.title,
        slug: job.slug || slugify(job.title),
        department: job.department,
        location: job.location || "",
        description: job.description || "",
        type: job.type || "Full-time",
        is_active: job.is_active,
        requirements: job.requirements || "",
        responsibilities: job.responsibilities || "",
        salary_range: job.salary_range || "",
        summary: job.summary || "",
        seo_image_url: job.seo_image_url || "",
      });
    } else {
      setEditingJob(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    setSaving(true);
    try {
      const finalSlug = slugify(formData.slug || formData.title);
      const jobData = {
        title: formData.title,
        slug: finalSlug,
        department: formData.department,
        location: formData.location || null,
        description: formData.description || null,
        type: formData.type || null,
        is_active: formData.is_active,
        requirements: formData.requirements || null,
        responsibilities: formData.responsibilities || null,
        salary_range: formData.salary_range || null,
        summary: formData.summary || null,
        seo_image_url: formData.seo_image_url || null,
      };

      if (editingJob) {
        const { error } = await supabase
          .from("jobs")
          .update(jobData)
          .eq("id", editingJob.id);

        if (error) throw error;
        toast.success("Job updated successfully");
      } else {
        const { error } = await supabase
          .from("jobs")
          .insert([jobData]);

        if (error) throw error;
        toast.success("Job created successfully");
      }

      setDialogOpen(false);
      fetchJobs();
    } catch (error) {
      toast.error("Failed to save job");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      toast.success("Job deleted successfully");
      fetchJobs();
    } catch (error) {
      toast.error("Failed to delete job");
      console.error(error);
    }
  };

  const handleToggleActive = async (job: Job) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active: !job.is_active })
        .eq("id", job.id);

      if (error) throw error;
      toast.success(job.is_active ? "Job deactivated" : "Job activated");
      fetchJobs();
    } catch (error) {
      toast.error("Failed to update job status");
    }
  };

  if (loading) {
    return <div className="p-4">Loading jobs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Job Listings</h2>
          <p className="text-sm text-muted-foreground">
            Manage job postings displayed on the public Jobs page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Football Scout"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Scouting">Scouting</SelectItem>
                        <SelectItem value="Analysis">Analysis</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Coaching">Coaching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Remote, London, UK"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                    placeholder="e.g. £30,000 - £40,000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated from title (e.g. talent-scout)"
                  />
                  <p className="text-xs text-muted-foreground">Public URL: /jobs/{formData.slug || slugify(formData.title) || "slug"}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary (card & social preview)</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="One or two sentences shown on the listing card and in social previews."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Job description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="responsibilities">Responsibilities (use - for bullet points)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const cur = formData.responsibilities || "";
                        const sep = cur && !cur.endsWith("\n") ? "\n" : "";
                        setFormData({ ...formData, responsibilities: `${cur}${sep}- ` });
                      }}
                    >
                      + Add bullet
                    </Button>
                  </div>
                  <Textarea
                    id="responsibilities"
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    placeholder={"Optional intro paragraph...\n- First responsibility\n- Second responsibility\n- Third responsibility\nOptional closing line."}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requirements">Requirements (use - for bullet points)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const cur = formData.requirements || "";
                        const sep = cur && !cur.endsWith("\n") ? "\n" : "";
                        setFormData({ ...formData, requirements: `${cur}${sep}- ` });
                      }}
                    >
                      + Add bullet
                    </Button>
                  </div>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder={"Optional intro paragraph...\n- First requirement\n- Second requirement\n- Third requirement"}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_image">Social Share Image URL (optional)</Label>
                  <Input
                    id="seo_image"
                    value={formData.seo_image_url}
                    onChange={(e) => setFormData({ ...formData, seo_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active (visible on public page)</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button asChild variant="outline">
            <Link to="/jobs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Public Page
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No job listings yet</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className={!job.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      {job.title}
                      {!job.is_active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {job.department}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.type && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(job)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(job)}>
                      {job.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Job?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{job.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(job.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {job.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
