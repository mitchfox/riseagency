import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, Repeat, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../marketing-calendar.css';

const localizer = momentLocalizer(moment);

const PLATFORMS = ['Instagram', 'Facebook', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube'];
const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

interface ScheduledPost {
  id: string;
  title: string;
  description: string | null;
  post_type: 'single' | 'series';
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string | null;
  recurring_pattern: string | null;
  recurring_days: string[] | null;
  series_count: number | null;
  status: 'scheduled' | 'posted' | 'cancelled';
  canva_link: string | null;
  notes: string | null;
  created_at: string;
}

interface ScheduleManagerProps {
  canManage: boolean;
}

export const ScheduleManager = ({ canManage }: ScheduleManagerProps) => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    post_type: 'single' as 'single' | 'series',
    platforms: [] as string[],
    scheduled_date: '',
    scheduled_time: '',
    recurring_pattern: 'none',
    recurring_days: [] as string[],
    series_count: 1,
    canva_link: '',
    notes: '',
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts((data || []) as ScheduledPost[]);
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");

      const { error } = await supabase
        .from('scheduled_posts')
        .insert({
          title: form.title,
          description: form.description || null,
          post_type: form.post_type,
          platforms: form.platforms,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          recurring_pattern: form.recurring_pattern === 'none' ? null : form.recurring_pattern,
          recurring_days: form.recurring_days.length > 0 ? form.recurring_days : null,
          series_count: form.post_type === 'series' ? form.series_count : 1,
          canva_link: form.canva_link || null,
          notes: form.notes || null,
          created_by: staffUserId,
        });

      if (error) throw error;

      toast.success('Post scheduled successfully');
      setShowDialog(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Failed to schedule post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('Delete this scheduled post?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete post');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      post_type: 'single',
      platforms: [],
      scheduled_date: '',
      scheduled_time: '',
      recurring_pattern: 'none',
      recurring_days: [],
      series_count: 1,
      canva_link: '',
      notes: '',
    });
  };

  const togglePlatform = (platform: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day]
    }));
  };

  const calendarEvents = useMemo(() => posts.map(post => ({
    title: post.title,
    start: new Date(post.scheduled_date),
    end: new Date(post.scheduled_date),
    resource: post,
  })), [posts]);

  const eventPropGetter = useCallback((event: any) => {
    const post = event.resource;
    return {
      style: {
        backgroundColor: 
          post.status === 'posted' ? '#22c55e' :
          post.status === 'cancelled' ? '#ef4444' :
          post.post_type === 'series' ? '#8b5cf6' :
          '#3b82f6',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
      }
    };
  }, []);

  const onSelectEvent = useCallback((event: any) => {
    const post = event.resource;
    if (canManage && confirm(`Delete "${post.title}"?`)) {
      handleDelete(post.id);
    }
  }, [canManage]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Content Schedule</CardTitle>
              <CardDescription>Plan and track your content calendar</CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Post
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] bg-background rounded-lg">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'agenda']}
              defaultView="month"
              onSelectEvent={onSelectEvent}
              eventPropGetter={eventPropGetter}
            />
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Single Post</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Series</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Posted</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Post</DialogTitle>
            <DialogDescription>
              Schedule a single post or recurring series
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Post title or series name"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this post about?"
                  rows={2}
                />
              </div>

              <div>
                <Label>Post Type</Label>
                <Select
                  value={form.post_type}
                  onValueChange={(v) => setForm({ ...form, post_type: v as 'single' | 'series' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Post</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.post_type === 'series' && (
                <div>
                  <Label htmlFor="series_count">Number of Posts</Label>
                  <Input
                    id="series_count"
                    type="number"
                    min={2}
                    value={form.series_count}
                    onChange={(e) => setForm({ ...form, series_count: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="scheduled_date">Start Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="scheduled_time">Time</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                />
              </div>

              {form.post_type === 'series' && (
                <>
                  <div>
                    <Label>Recurring Pattern</Label>
                    <Select
                      value={form.recurring_pattern}
                      onValueChange={(v) => setForm({ ...form, recurring_pattern: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No recurrence</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recurring_pattern === 'custom' && (
                    <div className="col-span-2">
                      <Label>Post on these days</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {DAYS_OF_WEEK.map(day => (
                          <Button
                            key={day.id}
                            type="button"
                            variant={form.recurring_days.includes(day.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDay(day.id)}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="col-span-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PLATFORMS.map(platform => (
                    <Button
                      key={platform}
                      type="button"
                      variant={form.platforms.includes(platform) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="canva_link">Canva Link</Label>
                <Input
                  id="canva_link"
                  value={form.canva_link}
                  onChange={(e) => setForm({ ...form, canva_link: e.target.value })}
                  placeholder="https://canva.com/..."
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Scheduling...' : 'Schedule'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
