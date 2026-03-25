import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, ExternalLink, ChevronLeft, ChevronRight, Clock3, User, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { addDays, format as formatDate, isSameDay, parseISO, startOfWeek } from 'date-fns';
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

const RECURRING_PATTERNS = [
  { value: 'none', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom days' },
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
  template_id?: string | null;
}

interface Template {
  id: string;
  title: string;
  url: string | null;
  folder_id: string | null;
}

interface TemplateFolder {
  id: string;
  title: string;
}

interface CompletedPost {
  id: string;
  title: string;
  canva_link: string | null;
}

interface DraftContentPost {
  id: string;
  title: string;
  canva_link: string | null;
  workflow_status: string | null;
  assigned_to?: string | null;
  completed_by?: string | null;
}

interface ScheduleManagerProps {
  canManage: boolean;
  compact?: boolean;
}

export const ScheduleManager = ({ canManage, compact = false }: ScheduleManagerProps) => {
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateFolders, setTemplateFolders] = useState<TemplateFolder[]>([]);
  const [completedPosts, setCompletedPosts] = useState<CompletedPost[]>([]);
  const [draftPosts, setDraftPosts] = useState<DraftContentPost[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [templateSource, setTemplateSource] = useState<'folder' | 'completed' | 'draft'>('folder');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
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
    template_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchPosts();
    fetchTemplateFolders();
    fetchCompletedPosts();
    fetchDraftPosts();
    fetchOwners();
  }, []);

  // Fetch templates when selected folder changes
  useEffect(() => {
    if (selectedFolderId) {
      fetchTemplatesFromFolder(selectedFolderId);
    } else {
      setTemplates([]);
    }
  }, [selectedFolderId]);

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

  const fetchTemplateFolders = async () => {
    try {
      const { data: folders, error: folderError } = await supabase
        .from('custom_marketing_resources')
        .select('id, title')
        .eq('resource_type', 'folder')
        .order('title');

      if (folderError) throw folderError;
      setTemplateFolders((folders || []) as TemplateFolder[]);
    } catch (error) {
      console.error('Failed to fetch template folders:', error);
    }
  };

  const fetchTemplatesFromFolder = async (folderId: string) => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('custom_marketing_resources')
        .select('id, title, url, folder_id')
        .eq('folder_id', folderId)
        .eq('resource_type', 'link')
        .order('title');

      if (templateError) throw templateError;
      setTemplates((templateData || []) as Template[]);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchCompletedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, canva_link')
        .eq('workflow_status', 'posted')
        .order('title');

      if (error) throw error;
      setCompletedPosts((data || []) as CompletedPost[]);
    } catch (error) {
      console.error('Failed to fetch completed posts:', error);
    }
  };

  const fetchDraftPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, canva_link, workflow_status, assigned_to, completed_by')
        .neq('workflow_status', 'posted')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDraftPosts((data || []) as DraftContentPost[]);
    } catch (error) {
      console.error('Failed to fetch draft posts:', error);
    }
  };

  const fetchOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;

      const mapped = (data || []).reduce<Record<string, string>>((acc, profile: any) => {
        if (profile.id) acc[profile.id] = profile.full_name || 'Team';
        return acc;
      }, {});

      setOwnerNames(mapped);
    } catch (error) {
      console.error('Failed to fetch owners:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");

      // Get the template/post URL based on source
      let canvaLink: string | null = null;
      if (templateSource === 'folder') {
        const selectedTemplate = templates.find(t => t.id === form.template_id);
        canvaLink = selectedTemplate?.url || null;
      } else if (templateSource === 'draft') {
        const selectedDraft = draftPosts.find(p => p.id === form.template_id);
        canvaLink = selectedDraft?.canva_link || null;
      } else {
        const selectedPost = completedPosts.find(p => p.id === form.template_id);
        canvaLink = selectedPost?.canva_link || null;
      }
      
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
          canva_link: canvaLink,
          notes: form.notes || null,
          created_by: staffUserId,
        });

      if (error) throw error;

      toast.success('Post scheduled successfully');
      setShowDialog(false);
      resetForm();
      setSelectedFolderId('');
      setTemplateSource('folder');
      fetchPosts();
      fetchDraftPosts();
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
      template_id: '',
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

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart]
  );

  const weeklyBoard = useMemo(
    () => weekDays.map((day) => ({
      day,
      posts: posts
        .filter((post) => isSameDay(parseISO(post.scheduled_date), day))
        .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')),
    })),
    [posts, weekDays]
  );

  const unscheduledDraftPosts = useMemo(
    () => draftPosts.filter((draft) => !posts.some((post) => post.title.trim().toLowerCase() === draft.title.trim().toLowerCase())),
    [draftPosts, posts]
  );

  const moveWeek = (direction: -1 | 1) => {
    setCurrentWeekStart((prev) => addDays(prev, direction * 7));
  };

  const openScheduleForDay = (day: Date) => {
    setForm((prev) => ({
      ...prev,
      scheduled_date: formatDate(day, 'yyyy-MM-dd'),
    }));
    setShowDialog(true);
  };

  const openDraftInSchedule = (draft: DraftContentPost) => {
    setTemplateSource('draft');
    setSelectedFolderId('');
    setForm((prev) => ({
      ...prev,
      title: draft.title,
      template_id: draft.id,
      notes: prev.notes || `Linked to Content Creator: ${draft.workflow_status || 'draft'}`,
    }));
    setShowDialog(true);
  };

  const getOwnerLabel = (post: ScheduledPost) => {
    if (!post.created_at) return 'Team';
    return ownerNames[(post as any).created_by || ''] || 'Team';
  };

  const getPostStatusLabel = (post: ScheduledPost) => {
    if (post.status === 'posted') return 'Posted';
    if (post.status === 'cancelled') return 'Cancelled';
    if (post.canva_link) return 'Ready to post';
    return 'Planned';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Compact mode for embedding in PostContent
  if (compact) {
    return (
      <>
        <div className="h-[400px] bg-background rounded-lg">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['month', 'week']}
            defaultView="month"
            onSelectEvent={onSelectEvent}
            eventPropGetter={eventPropGetter}
          />
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-border bg-primary/70" />
            <span>Single Post</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-border bg-accent" />
            <span>Series</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-border bg-secondary" />
            <span>Posted</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-border bg-muted-foreground/40" />
            <span>Cancelled</span>
          </div>
        </div>

        {/* Schedule Dialog for compact mode */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Post</DialogTitle>
              <DialogDescription>
                Schedule a single post or recurring series
              </DialogDescription>
            </DialogHeader>
            {renderScheduleForm()}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Weekly content plan with clear post styles, timing, ownership and posting readiness.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => moveWeek(-1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous week
                </Button>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {formatDate(weekDays[0], 'd MMM')} to {formatDate(weekDays[6], 'd MMM')}
                </div>
                <Button variant="outline" size="sm" onClick={() => moveWeek(1)}>
                  Next week
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                {canManage && (
                  <Button onClick={() => setShowDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add post
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.25fr_3fr]">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ready from Content Creator</CardTitle>
                  <CardDescription>Tag unposted content into the weekly plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unscheduledDraftPosts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                      No unposted content waiting to be scheduled.
                    </div>
                  ) : (
                    unscheduledDraftPosts.slice(0, 8).map((draft) => (
                      <div key={draft.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{draft.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{draft.workflow_status || 'Draft'}</p>
                          </div>
                          <Badge variant={draft.canva_link ? 'default' : 'secondary'}>
                            {draft.canva_link ? 'Ready' : 'In progress'}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {canManage && (
                            <Button size="sm" variant="outline" onClick={() => openDraftInSchedule(draft)}>
                              <Link2 className="mr-2 h-3.5 w-3.5" />
                              Tag into week
                            </Button>
                          )}
                          {draft.canva_link && (
                            <a href={draft.canva_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              Open asset
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="overflow-x-auto">
                <div className="grid min-w-[980px] grid-cols-7 gap-3">
                  {weeklyBoard.map(({ day, posts: dayPosts }) => (
                    <div key={day.toISOString()} className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{formatDate(day, 'EEEE')}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(day, 'd MMM')}</p>
                        </div>
                        <Badge variant="secondary">{dayPosts.length}</Badge>
                      </div>

                      <div className="space-y-3">
                        {dayPosts.length === 0 && (
                          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-5 text-center text-xs text-muted-foreground">
                            No posts planned
                          </div>
                        )}

                        {dayPosts.map((post) => (
                          <div key={post.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight">{post.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{post.description || (post.post_type === 'series' ? 'Series content' : 'Single post')}</p>
                              </div>
                              <Badge variant={post.canva_link ? 'default' : 'secondary'}>{getPostStatusLabel(post)}</Badge>
                            </div>

                            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span>{post.scheduled_time || 'Time TBC'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>{getOwnerLabel(post)}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(post.platforms || []).map((platform) => (
                                <Badge key={platform} variant="outline" className="text-[10px]">{platform}</Badge>
                              ))}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              {post.canva_link ? (
                                <a href={post.canva_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open asset
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Creation not linked yet</span>
                              )}

                              {canManage && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(post.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {canManage && (
                          <Button variant="outline" className="w-full" size="sm" onClick={() => openScheduleForDay(day)}>
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Add for {formatDate(day, 'EEE')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Calendar view</CardTitle>
                <CardDescription>Secondary overview for the same scheduled posts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`${isMobile ? 'h-[350px]' : 'h-[420px]'} bg-background rounded-lg`}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    views={['month', 'week', 'agenda']}
                    defaultView={isMobile ? "agenda" : "month"}
                    onSelectEvent={onSelectEvent}
                    eventPropGetter={eventPropGetter}
                  />
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Post</DialogTitle>
            <DialogDescription>
              Schedule a single post or recurring series
            </DialogDescription>
          </DialogHeader>
          {renderScheduleForm()}
        </DialogContent>
      </Dialog>
    </>
  );

  function renderScheduleForm() {
    const selectedTemplate = templates.find(t => t.id === form.template_id);
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="title">Post style / title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Highlight reel, player graphic, matchday story"
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
                    {RECURRING_PATTERNS.map(pattern => (
                      <SelectItem key={pattern.value} value={pattern.value}>
                        {pattern.label}
                      </SelectItem>
                    ))}
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
            <Label>Template Source</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={templateSource === 'folder' ? "default" : "outline"}
                size="sm"
                onClick={() => { setTemplateSource('folder'); setForm({ ...form, template_id: '' }); }}
              >
                From Folder
              </Button>
              <Button
                type="button"
                variant={templateSource === 'completed' ? "default" : "outline"}
                size="sm"
                onClick={() => { setTemplateSource('completed'); setForm({ ...form, template_id: '' }); setSelectedFolderId(''); }}
              >
                Posted Content
              </Button>
              <Button
                type="button"
                variant={templateSource === 'draft' ? "default" : "outline"}
                size="sm"
                onClick={() => { setTemplateSource('draft'); setForm({ ...form, template_id: '' }); setSelectedFolderId(''); }}
              >
                Content Creator
              </Button>
            </div>
          </div>

          {templateSource === 'folder' && (
            <>
              <div>
                <Label>Select Folder</Label>
                <Select
                  value={selectedFolderId || "none"}
                  onValueChange={(v) => { setSelectedFolderId(v === "none" ? "" : v); setForm({ ...form, template_id: '' }); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select folder...</SelectItem>
                    {templateFolders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template</Label>
                <Select
                  value={form.template_id || "none"}
                  onValueChange={(v) => setForm({ ...form, template_id: v === "none" ? "" : v })}
                  disabled={!selectedFolderId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedFolderId ? "Select template..." : "Select folder first..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && selectedTemplate.url && (
                  <a
                    href={selectedTemplate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open template
                  </a>
                )}
              </div>
            </>
          )}

          {templateSource === 'completed' && (
            <div className="col-span-2">
              <Label>Completed Post</Label>
              <Select
                value={form.template_id || "none"}
                onValueChange={(v) => setForm({ ...form, template_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select completed post..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No post selected</SelectItem>
                  {completedPosts.map(post => (
                    <SelectItem key={post.id} value={post.id}>
                      {post.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {completedPosts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No completed posts available. Mark posts as "Posted" in Content Creator.
                </p>
              )}
            </div>
          )}

          {templateSource === 'draft' && (
            <div className="col-span-2">
              <Label>Content Creator item</Label>
              <Select
                value={form.template_id || "none"}
                onValueChange={(v) => {
                  const nextId = v === "none" ? "" : v;
                  const selectedDraft = draftPosts.find((post) => post.id === nextId);
                  setForm({
                    ...form,
                    template_id: nextId,
                    title: selectedDraft?.title || form.title,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unposted content..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No content linked</SelectItem>
                  {draftPosts.map(post => (
                    <SelectItem key={post.id} value={post.id}>
                      {post.title} {post.workflow_status ? `• ${post.workflow_status}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draftPosts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No unposted Content Creator items found.
                </p>
              )}
            </div>
          )}

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
    );
  }
};
