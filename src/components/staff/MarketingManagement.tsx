import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, Image, Upload, Trash2, Play, List, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoPreviewCard } from "./VideoPreviewCard";
import { PlaylistManager } from "@/components/PlaylistManager";
import { HomepageVideoManager } from "./HomepageVideoManager";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './marketing-calendar.css';
import { MarketingResources } from './marketing/MarketingResources';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const localizer = momentLocalizer(moment);


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
  const [activeTab, setActiveTab] = useState("gallery");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'brand' | 'players' | 'other'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');
  const [videoPlayerFilter, setVideoPlayerFilter] = useState<string>('all');
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
  const [importingClipUrl, setImportingClipUrl] = useState<string | null>(null);
  const [clipSearchQuery, setClipSearchQuery] = useState('');
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] = useState<GalleryItem | null>(null);
  const [playlistPlayerData, setPlaylistPlayerData] = useState<any>(null);
  const [showHomepageVideos, setShowHomepageVideos] = useState(false);

  useEffect(() => {
    // Fetch data for Gallery & Planner tabs on mount
    fetchGalleryItems();
    fetchPlayers();
    fetchCampaigns();
  }, []);

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

  const openPlaylistForVideo = async (item: GalleryItem) => {
    if (!item.player_id) return;
    
    try {
      const { data: player, error } = await supabase
        .from('players')
        .select('id, name, email, highlights')
        .eq('id', item.player_id)
        .single();
      
      if (error || !player) {
        toast.error('Failed to load player data');
        return;
      }
      
      setSelectedVideoForPlaylist(item);
      setPlaylistPlayerData(player);
      setShowPlaylistManager(true);
    } catch (err) {
      console.error('Error loading player for playlist:', err);
      toast.error('Failed to load player data');
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

    setImportingClipUrl(videoUrl);
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
      setImportingClipUrl(null);
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
      {/* Resources Section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Resources</h2>
        </div>
        <MarketingResources />
      </section>

      {/* Gallery & Planner Section - Tabbed for workflow */}
      <section>
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="gallery">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-max md:w-full md:grid md:grid-cols-2 gap-1 h-auto p-1 mb-4">
              <TabsTrigger value="gallery" className="text-xs md:text-sm px-3 md:px-6 py-2 whitespace-nowrap">
                <Image className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="planner" className="text-xs md:text-sm px-3 md:px-6 py-2 whitespace-nowrap">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Planner
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Gallery</CardTitle>
              <CardDescription>Upload and manage images and videos for marketing</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="videos" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="images">
                    <Image className="w-4 h-4 mr-2" />
                    Images
                  </TabsTrigger>
                  <TabsTrigger value="videos">
                    <Play className="w-4 h-4 mr-2" />
                    Videos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
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
                        <Button onClick={() => setShowUploadDialog(true)} size="sm" className="md:size-default">
                          <Upload className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Upload Image</span>
                          <span className="sm:hidden">Upload</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const filtered = categoryFilter === 'all' 
                      ? galleryItems.filter(item => item.file_type === 'image')
                      : categoryFilter === 'players' && selectedPlayerId !== 'all'
                        ? galleryItems.filter(item => item.file_type === 'image' && item.category === 'players' && item.player_id === selectedPlayerId)
                        : galleryItems.filter(item => item.file_type === 'image' && item.category === categoryFilter);
                    
                    return filtered.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No images in this category</p>
                        <p className="text-sm">Upload images to build your marketing gallery</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
                            <div className="relative aspect-video bg-muted">
                              <img
                                src={item.file_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
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
                </TabsContent>

                <TabsContent value="videos" className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      <Select value={videoPlayerFilter} onValueChange={setVideoPlayerFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="All Players" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="all">All Players</SelectItem>
                          {players.map(player => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {canManage && (
                        <>
                          <Button onClick={() => setShowUploadDialog(true)} size="sm" className="md:size-default">
                            <Upload className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Upload Video</span>
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
                          <Button 
                            onClick={() => setShowHomepageVideos(true)} 
                            size="sm" 
                            variant="outline"
                            className="md:size-default"
                          >
                            <List className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">3D Portfolio</span>
                            <span className="sm:hidden">Portfolio</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const filtered = videoPlayerFilter !== 'all'
                      ? galleryItems.filter(item => item.file_type === 'video' && item.player_id === videoPlayerFilter)
                      : galleryItems.filter(item => item.file_type === 'video');
                    
                    return filtered.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No videos in this category</p>
                        <p className="text-sm">Upload or import videos to build your marketing gallery</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
                            <div className="relative aspect-video bg-muted">
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
                                {item.player_id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPlaylistForVideo(item)}
                                    title="Add to Playlist"
                                  >
                                    <List className="w-4 h-4" />
                                  </Button>
                                )}
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
                </TabsContent>
              </Tabs>
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
      </section>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Upload images or videos to your marketing gallery
            </DialogDescription>
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
            <DialogDescription>
              Plan and schedule a new marketing campaign
            </DialogDescription>
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
            <DialogDescription>
              Select player highlights to import to your marketing gallery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search clips..."
                value={clipSearchQuery}
                onChange={(e) => setClipSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            {playerHighlights.filter(player => {
              // Parse highlights and build videos array
              let highlights = player.highlights as any;
              if (typeof highlights === 'string') {
                try {
                  highlights = JSON.parse(highlights);
                } catch (e) {
                  return false;
                }
              }

              const matchHighlights = Array.isArray(highlights?.matchHighlights) ? highlights.matchHighlights : [];
              const bestClips = Array.isArray(highlights?.bestClips) ? highlights.bestClips : [];
              const videos = [...matchHighlights, ...bestClips];

              if (!Array.isArray(videos) || videos.length === 0) return false;

              const search = clipSearchQuery.trim().toLowerCase();
              if (!search) return true;

              // Check if any clip title matches
              return videos.some((video: any) => {
                const videoTitle = video?.title || video?.name || '';
                return videoTitle.toLowerCase().includes(search);
              });
            }).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{clipSearchQuery ? 'No clips found matching your search' : 'No player highlights available to import'}</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {playerHighlights.filter(player => {
                  // Parse highlights and build videos array
                  let highlights = player.highlights as any;
                  if (typeof highlights === 'string') {
                    try {
                      highlights = JSON.parse(highlights);
                    } catch (e) {
                      return false;
                    }
                  }

                  const matchHighlights = Array.isArray(highlights?.matchHighlights) ? highlights.matchHighlights : [];
                  const bestClips = Array.isArray(highlights?.bestClips) ? highlights.bestClips : [];
                  const videos = [...matchHighlights, ...bestClips];

                  if (!Array.isArray(videos) || videos.length === 0) return false;

                  const search = clipSearchQuery.trim().toLowerCase();
                  if (!search) return true;

                  // Check if any clip title matches
                  return videos.some((video: any) => {
                    const videoTitle = video?.title || video?.name || '';
                    return videoTitle.toLowerCase().includes(search);
                  });
                }).map((player) => {
                  let highlights = player.highlights as any;

                  // Handle potential stringified JSON
                  if (typeof highlights === 'string') {
                    try {
                      highlights = JSON.parse(highlights);
                    } catch (e) {
                      console.error('Failed to parse highlights JSON for player', player.id, e);
                      highlights = {};
                    }
                  }

                  const matchHighlights = Array.isArray(highlights?.matchHighlights)
                    ? highlights.matchHighlights
                    : [];
                  const bestClips = Array.isArray(highlights?.bestClips)
                    ? highlights.bestClips
                    : [];

                  const videos = [...matchHighlights, ...bestClips];
                  
                  if (!Array.isArray(videos) || videos.length === 0) return null;

                  const search = clipSearchQuery.trim().toLowerCase();
                  const filteredVideos = !search
                    ? videos
                    : videos.filter((video: any) => {
                        const videoTitle = video?.title || video?.name || '';
                        return videoTitle.toLowerCase().includes(search);
                      });

                  if (!Array.isArray(filteredVideos) || filteredVideos.length === 0) return null;
                  
                  return (
                    <AccordionItem key={player.id} value={player.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{player.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({filteredVideos.length} {filteredVideos.length === 1 ? 'clip' : 'clips'})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {filteredVideos.map((video: any, index: number) => {
                            const videoUrl = video.url || video.videoUrl || video;
                            const videoTitle = video.title || video.name || `Highlight ${index + 1}`;
                            
                            if (typeof videoUrl !== 'string') return null;
                            
                            return (
                              <VideoPreviewCard
                                key={index}
                                videoUrl={videoUrl}
                                videoTitle={videoTitle}
                                onImport={() => handleImportVideo(player.id, player.name, videoUrl, videoTitle)}
                                isImporting={importingClipUrl === videoUrl}
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist Manager */}
      {showPlaylistManager && selectedVideoForPlaylist && playlistPlayerData && (
        <PlaylistManager
          playerData={playlistPlayerData}
          availableClips={(() => {
            // Get all videos for this player from gallery
            const playerVideos = galleryItems
              .filter(item => item.file_type === 'video' && item.player_id === playlistPlayerData.id)
              .map(item => ({
                id: item.id,
                name: item.title,
                videoUrl: item.file_url
              }));
            
            // Also include player's existing highlights
            let highlights = playlistPlayerData.highlights;
            if (typeof highlights === 'string') {
              try {
                highlights = JSON.parse(highlights);
              } catch (e) {
                highlights = {};
              }
            }
            
            const matchHighlights = Array.isArray(highlights?.matchHighlights) ? highlights.matchHighlights : [];
            const bestClips = Array.isArray(highlights?.bestClips) ? highlights.bestClips : [];
            const existingClips = [...matchHighlights, ...bestClips].map((clip: any, index: number) => ({
              id: clip.url || clip.videoUrl || `clip-${index}`,
              name: clip.title || clip.name || `Highlight ${index + 1}`,
              videoUrl: clip.url || clip.videoUrl || clip
            }));
            
            return [...playerVideos, ...existingClips];
          })()}
          onClose={() => {
            setShowPlaylistManager(false);
            setSelectedVideoForPlaylist(null);
            setPlaylistPlayerData(null);
          }}
        />
      )}

      {/* Homepage Video Manager Dialog */}
      <Dialog open={showHomepageVideos} onOpenChange={setShowHomepageVideos}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>3D Portfolio Videos</DialogTitle>
            <DialogDescription>
              Manage videos displayed on the homepage 3D portfolio
            </DialogDescription>
          </DialogHeader>
          <HomepageVideoManager canManage={canManage} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
