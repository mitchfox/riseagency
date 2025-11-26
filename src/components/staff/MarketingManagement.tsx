import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, FileText, Image, Table, Folder, HardDrive, ExternalLink, Upload, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, momentLocalizer, Event as CalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './marketing-calendar.css';

const localizer = momentLocalizer(moment);

const marketingLinks = [
  {
    title: "Post Templates",
    description: "Content templates and planning",
    icon: FileText,
    url: "https://flaxen-voice-e64.notion.site/1c248d32b9a181c9aab5c06bace0237b?v=1c248d32b9a18158b8fc000c0a4166b0",
    color: "text-blue-500"
  },
  {
    title: "Canva Design",
    description: "Design templates and assets",
    icon: Image,
    url: "https://www.canva.com/design/DAG0N9vOwtg/6ZmTuSDkJzR9_b0nl7czJA/edit?utm_content=DAG0N9vOwtg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    color: "text-purple-500"
  },
  {
    title: "Player Images",
    description: "Player photo templates",
    icon: Image,
    url: "https://www.canva.com/design/DAG0Fs-P2oY/xnS87xfydD4uus5vACSKgA/edit",
    color: "text-green-500"
  },
  {
    title: "Topic Schedule",
    description: "Content calendar and planning",
    icon: Table,
    url: "https://docs.google.com/spreadsheets/d/1UtMiSeVkxDCP0b6DJmuB72dKHTUHAfyInUB_Ts2iRcc/edit?usp=sharing",
    color: "text-orange-500"
  },
  {
    title: "Canva Folder",
    description: "Templates and published posts",
    icon: Folder,
    url: "https://www.canva.com/folder/FAFRi-Qvnf4",
    color: "text-pink-500"
  },
  {
    title: "Google Drive",
    description: "Shared marketing resources",
    icon: HardDrive,
    url: "https://drive.google.com/drive/folders/1fCfrG6bY8YuEjm7bVMaxIGEoXOyCBLMj?usp=sharing",
    color: "text-indigo-500"
  }
];

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: 'image' | 'video';
  thumbnail_url: string | null;
  category: 'brand' | 'players' | 'other';
  player_id: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  platform: string[];
  target_audience: string | null;
  goals: string | null;
  budget: number | null;
  created_at: string;
}

export const MarketingManagement = ({ isAdmin, isMarketeer }: { isAdmin: boolean; isMarketeer?: boolean }) => {
  const canManage = isAdmin || isMarketeer;
  const [activeTab, setActiveTab] = useState("resources");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'brand' | 'players' | 'other'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');
  const [players, setPlayers] = useState<any[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
    category: 'other' as 'brand' | 'players' | 'other',
    player_id: null as string | null,
  });
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft' as 'draft' | 'active' | 'completed' | 'cancelled',
    platform: [] as string[],
    target_audience: '',
    goals: '',
    budget: '',
  });

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [playerHighlights, setPlayerHighlights] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchGalleryItems();
      fetchPlayers();
    }
    if (activeTab === 'planner') {
      fetchCampaigns();
    }
  }, [activeTab]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, name')
      .order('name');
    
    setPlayers(data || []);
  };

  const fetchGalleryItems = async () => {
    console.log('Fetching gallery items...');
    const { data, error } = await supabase
      .from('marketing_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch gallery items:', error);
      return;
    }

    console.log('Gallery items fetched:', data?.length || 0, 'items');
    console.log('Sample item:', data?.[0]);
    setGalleryItems((data || []) as GalleryItem[]);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !canManage) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(filePath);

      // Determine file type
      const fileType = uploadForm.file.type.startsWith('video/') ? 'video' : 'image';

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('marketing_gallery')
        .insert([{
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_url: publicUrl,
          file_type: fileType,
          category: uploadForm.category,
          player_id: uploadForm.player_id,
        }]);

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', file: null, category: 'other', player_id: null });
      fetchGalleryItems();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!canManage || !confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      // Extract file path from URL
      const urlParts = item.file_url.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('marketing-gallery')
        .remove([filePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('marketing_gallery')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      toast.success('Item deleted successfully');
      fetchGalleryItems();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    }
  };

  const fetchPlayerHighlights = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, highlights')
      .not('highlights', 'is', null)
      .order('name');
    
    if (error) {
      console.error('Failed to fetch player highlights:', error);
      return;
    }

    setPlayerHighlights(data || []);
  };

  const handleImportVideo = async (playerId: string, playerName: string, videoUrl: string, videoTitle: string) => {
    if (!canManage) return;

    setImporting(true);
    try {
      const { error } = await supabase
        .from('marketing_gallery')
        .insert({
          title: `${playerName} - ${videoTitle}`,
          description: 'Imported from player highlights',
          file_url: videoUrl,
          file_type: 'video',
          category: 'players',
          player_id: playerId,
        });

      if (error) throw error;

      toast.success('Video imported to marketing gallery');
      fetchGalleryItems();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import video');
    } finally {
      setImporting(false);
    }
  };

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch campaigns:', error);
      return;
    }

    setCampaigns((data || []) as Campaign[]);
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManage) {
      toast.error('Permission denied');
      return;
    }

    setSavingCampaign(true);

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert([{
          title: campaignForm.title,
          description: campaignForm.description || null,
          start_date: campaignForm.start_date,
          end_date: campaignForm.end_date || null,
          status: campaignForm.status,
          platform: campaignForm.platform,
          target_audience: campaignForm.target_audience || null,
          goals: campaignForm.goals || null,
          budget: campaignForm.budget ? parseFloat(campaignForm.budget) : null,
        }]);

      if (error) throw error;

      toast.success('Campaign created successfully');
      setShowCampaignDialog(false);
      setCampaignForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'draft',
        platform: [],
        target_audience: '',
        goals: '',
        budget: '',
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Campaign creation error:', error);
      toast.error('Failed to create campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!canManage || !confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resources">
            <Folder className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Image className="w-4 h-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="planner">
            <Calendar className="w-4 h-4 mr-2" />
            Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Resources</CardTitle>
              <CardDescription>Quick access to all marketing tools and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {marketingLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg bg-muted ${link.color}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                  {link.title}
                                </h3>
                                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {link.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Marketing Gallery</CardTitle>
                  <CardDescription>Upload and manage images and videos for marketing</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Select value={categoryFilter} onValueChange={(v) => {
                    setCategoryFilter(v as any);
                    setSelectedPlayerId('all');
                  }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="players">Players</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {categoryFilter === 'players' && (
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="All Players" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Players</SelectItem>
                        {players.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {canManage && (
                    <>
                      <Button onClick={() => setShowUploadDialog(true)} size="sm" className="md:size-default">
                        <Upload className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Upload Media</span>
                        <span className="sm:hidden">Upload</span>
                      </Button>
                      <Button 
                        onClick={() => {
                          setShowImportDialog(true);
                          fetchPlayerHighlights();
                        }} 
                        size="sm" 
                        variant="outline"
                        className="md:size-default"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Import from Clips</span>
                        <span className="sm:hidden">Import</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Show ALL items when "all" is selected, no filtering
                const filtered = categoryFilter === 'all' 
                  ? galleryItems 
                  : categoryFilter === 'players' && selectedPlayerId !== 'all'
                    ? galleryItems.filter(item => item.category === 'players' && item.player_id === selectedPlayerId)
                    : galleryItems.filter(item => item.category === categoryFilter);
                
                console.log('Rendering gallery:', { 
                  categoryFilter, 
                  selectedPlayerId, 
                  totalItems: galleryItems.length, 
                  filteredItems: filtered.length 
                });
                
                return filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No media in this category</p>
                  <p className="text-sm">Upload images and videos to build your marketing gallery</p>
                  <p className="text-xs mt-2 text-destructive">Total in DB: {galleryItems.length}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        {item.file_type === 'image' ? (
                          <img
                            src={item.file_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={item.file_url}
                              className="w-full h-full object-cover"
                              controls
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Play className="w-12 h-12 text-white opacity-80" />
                            </div>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(item.file_url, '_blank')}
                          >
                            View Full
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Marketing Calendar</CardTitle>
                  <CardDescription>Plan and track marketing campaigns</CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => setShowCampaignDialog(true)}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] bg-background rounded-lg p-4">
                <Calendar
                  localizer={localizer}
                  events={useMemo(() => campaigns.map(campaign => ({
                    title: campaign.title,
                    start: new Date(campaign.start_date),
                    end: campaign.end_date ? new Date(campaign.end_date) : new Date(campaign.start_date),
                    resource: campaign,
                  })), [campaigns])}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day', 'agenda']}
                  defaultView="month"
                  onSelectEvent={useCallback((event: any) => {
                    const campaign = event.resource;
                    if (canManage && confirm(`Delete campaign "${campaign.title}"?`)) {
                      handleDeleteCampaign(campaign.id);
                    }
                  }, [canManage])}
                  eventPropGetter={useCallback((event: any) => {
                    const campaign = event.resource;
                    return {
                      style: {
                        backgroundColor: 
                          campaign.status === 'active' ? '#22c55e' :
                          campaign.status === 'completed' ? '#3b82f6' :
                          campaign.status === 'cancelled' ? '#ef4444' :
                          '#6b7280',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                      }
                    };
                  }, [])}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
                placeholder="Enter media title"
              />
            </div>

            {uploadForm.category === 'players' && (
              <div>
                <Label htmlFor="upload-player">Player (Optional)</Label>
                <Select
                  value={uploadForm.player_id || 'none'}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, player_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific player</SelectItem>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="upload-category">Category *</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) => setUploadForm({ ...uploadForm, category: v as any })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="players">Players</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upload-file">File *</Label>
              <Input
                id="upload-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadForm({ title: '', description: '', file: null, category: 'other', player_id: null });
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            <div>
              <Label htmlFor="campaign-title">Title *</Label>
              <Input
                id="campaign-title"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                required
                placeholder="Campaign name"
              />
            </div>

            <div>
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea
                id="campaign-description"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                placeholder="Campaign description and objectives"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaign-start">Start Date *</Label>
                <Input
                  id="campaign-start"
                  type="date"
                  value={campaignForm.start_date}
                  onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="campaign-end">End Date</Label>
                <Input
                  id="campaign-end"
                  type="date"
                  value={campaignForm.end_date}
                  onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="campaign-status">Status</Label>
              <Select
                value={campaignForm.status}
                onValueChange={(v) => setCampaignForm({ ...campaignForm, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="campaign-platform">Platforms (comma-separated)</Label>
              <Input
                id="campaign-platform"
                value={campaignForm.platform.join(', ')}
                onChange={(e) => setCampaignForm({ 
                  ...campaignForm, 
                  platform: e.target.value.split(',').map(p => p.trim()).filter(p => p) 
                })}
                placeholder="Instagram, Facebook, Twitter"
              />
            </div>

            <div>
              <Label htmlFor="campaign-audience">Target Audience</Label>
              <Input
                id="campaign-audience"
                value={campaignForm.target_audience}
                onChange={(e) => setCampaignForm({ ...campaignForm, target_audience: e.target.value })}
                placeholder="e.g., Youth players, Professional scouts"
              />
            </div>

            <div>
              <Label htmlFor="campaign-goals">Goals</Label>
              <Textarea
                id="campaign-goals"
                value={campaignForm.goals}
                onChange={(e) => setCampaignForm({ ...campaignForm, goals: e.target.value })}
                placeholder="Campaign goals and KPIs"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="campaign-budget">Budget ($)</Label>
              <Input
                id="campaign-budget"
                type="number"
                step="0.01"
                value={campaignForm.budget}
                onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCampaignDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCampaign}>
                {savingCampaign ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import from Player Clips Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Videos from Player Clips</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {playerHighlights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No player highlights available to import</p>
              </div>
            ) : (
              playerHighlights.map((player) => {
                const highlights = player.highlights as any;
                const videos = highlights?.videos || highlights?.clips || [];
                
                if (!Array.isArray(videos) || videos.length === 0) return null;
                
                return (
                  <div key={player.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">{player.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {videos.map((video: any, index: number) => {
                        const videoUrl = video.url || video.videoUrl || video;
                        const videoTitle = video.title || video.name || `Highlight ${index + 1}`;
                        
                        if (typeof videoUrl !== 'string') return null;
                        
                        return (
                          <Card key={index} className="overflow-hidden">
                            <div className="relative aspect-video bg-muted">
                              <video
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                controls
                              />
                            </div>
                            <CardContent className="p-3">
                              <p className="text-sm font-medium mb-2">{videoTitle}</p>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleImportVideo(player.id, player.name, videoUrl, videoTitle)}
                                disabled={importing}
                              >
                                {importing ? 'Importing...' : 'Import to Gallery'}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
