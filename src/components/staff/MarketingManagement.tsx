import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Image, Upload, Trash2, Play, List, Folder, ChevronDown, Plus, Users, Tag, Download, Pencil } from "lucide-react";
import { StaffSearchInput } from "./StaffSearchInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoPreviewCard } from "./VideoPreviewCard";
import { PlaylistManager } from "@/components/PlaylistManager";
import { HomepageVideoManager } from "./HomepageVideoManager";
import { MarketingResources } from './marketing/MarketingResources';
import { MarketingStrategy } from './marketing/MarketingStrategy';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  tagged_player_ids?: string[];
}

export const MarketingManagement = ({ isAdmin, isMarketeer }: { isAdmin: boolean; isMarketeer?: boolean }) => {
  const canManage = isAdmin || isMarketeer;
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
    files: [] as File[],
    category: 'other' as 'brand' | 'players' | 'other',
    player_id: null as string | null,
  });

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [playerHighlights, setPlayerHighlights] = useState<any[]>([]);
  const [importingClipUrl, setImportingClipUrl] = useState<string | null>(null);
  const [clipSearchQuery, setClipSearchQuery] = useState('');
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] = useState<GalleryItem | null>(null);
  const [playlistPlayerData, setPlaylistPlayerData] = useState<any>(null);
  const [showHomepageVideos, setShowHomepageVideos] = useState(false);
  const [showTagPlayerDialog, setShowTagPlayerDialog] = useState(false);
  const [selectedVideoForTagging, setSelectedVideoForTagging] = useState<GalleryItem | null>(null);
  const [selectedTagPlayerIds, setSelectedTagPlayerIds] = useState<string[]>([]);
  const [videoPlayerTags, setVideoPlayerTags] = useState<Record<string, string[]>>({});
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPlayerId, setNewPlaylistPlayerId] = useState<string>('');
  const [editingImage, setEditingImage] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editFocalPoint, setEditFocalPoint] = useState<string>('center');

  // Collapsible section states
  const [openSections, setOpenSections] = useState<string[]>(["resources"]);

  useEffect(() => {
    fetchGalleryItems();
    fetchPlayers();
    fetchVideoTags();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, name')
      .order('name');
    
    setPlayers(data || []);
  };

  const fetchGalleryItems = async () => {
    const { data, error } = await supabase
      .from('marketing_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch gallery items:', error);
      return;
    }

    setGalleryItems((data || []) as GalleryItem[]);
  };

  const fetchVideoTags = async () => {
    const { data, error } = await supabase
      .from('video_player_tags')
      .select('video_id, player_id');

    if (error) {
      console.error('Failed to fetch video tags:', error);
      return;
    }

    // Group tags by video_id
    const tagsMap: Record<string, string[]> = {};
    (data || []).forEach((tag: any) => {
      if (!tagsMap[tag.video_id]) {
        tagsMap[tag.video_id] = [];
      }
      tagsMap[tag.video_id].push(tag.player_id);
    });
    setVideoPlayerTags(tagsMap);
  };

  const handleSaveVideoTags = async () => {
    if (!selectedVideoForTagging) return;

    try {
      // Delete existing tags for this video
      await supabase
        .from('video_player_tags')
        .delete()
        .eq('video_id', selectedVideoForTagging.id);

      // Insert new tags
      if (selectedTagPlayerIds.length > 0) {
        const tagsToInsert = selectedTagPlayerIds.map(playerId => ({
          video_id: selectedVideoForTagging.id,
          player_id: playerId,
        }));

        const { error } = await supabase
          .from('video_player_tags')
          .insert(tagsToInsert);

        if (error) throw error;
      }

      toast.success('Player tags updated');
      setShowTagPlayerDialog(false);
      setSelectedVideoForTagging(null);
      setSelectedTagPlayerIds([]);
      fetchVideoTags();
    } catch (error) {
      console.error('Failed to save video tags:', error);
      toast.error('Failed to save player tags');
    }
  };

  const openTagPlayerDialog = (item: GalleryItem) => {
    setSelectedVideoForTagging(item);
    setSelectedTagPlayerIds(videoPlayerTags[item.id] || []);
    setShowTagPlayerDialog(true);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !newPlaylistPlayerId) {
      toast.error('Please enter a name and select a player');
      return;
    }

    try {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id, name, highlights')
        .eq('id', newPlaylistPlayerId)
        .single();

      if (playerError) throw playerError;

      // Parse existing highlights
      let highlights: any = player.highlights;
      if (typeof highlights === 'string') {
        try {
          highlights = JSON.parse(highlights);
        } catch (e) {
          highlights = {};
        }
      }
      if (!highlights || typeof highlights !== 'object') highlights = {};

      // Add new empty playlist
      if (!highlights.playlists) highlights.playlists = [];
      highlights.playlists.push({
        name: newPlaylistName.trim(),
        clips: [],
        createdAt: new Date().toISOString(),
      });

      // Save back to player
      const { error: updateError } = await supabase
        .from('players')
        .update({ highlights: JSON.stringify(highlights) })
        .eq('id', newPlaylistPlayerId);

      if (updateError) throw updateError;

      toast.success('Playlist created');
      setShowCreatePlaylistDialog(false);
      setNewPlaylistName('');
      setNewPlaylistPlayerId('');
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error('Failed to create playlist');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.files.length || !canManage) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      for (const file of uploadForm.files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('marketing-gallery')
          .upload(filePath, file);

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('marketing-gallery')
          .getPublicUrl(filePath);

        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        const title = uploadForm.files.length === 1 
          ? uploadForm.title 
          : (uploadForm.title ? `${uploadForm.title} - ${file.name.replace(/\.[^/.]+$/, '')}` : file.name.replace(/\.[^/.]+$/, ''));

        const { error: dbError } = await supabase
          .from('marketing_gallery')
          .insert([{
            title,
            description: uploadForm.description || null,
            file_url: publicUrl,
            file_type: fileType,
            category: uploadForm.category,
            player_id: uploadForm.player_id,
          }]);

        if (dbError) {
          console.error(`Failed to save ${file.name}:`, dbError);
          continue;
        }
        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
      }
      if (successCount < uploadForm.files.length) {
        toast.error(`${uploadForm.files.length - successCount} file(s) failed to upload`);
      }
      
      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', files: [], category: 'other', player_id: null });
      fetchGalleryItems();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
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
      const urlParts = item.file_url.split('/');
      const filePath = urlParts[urlParts.length - 1];

      const { error: storageError } = await supabase.storage
        .from('marketing-gallery')
        .remove([filePath]);

      if (storageError) console.error('Storage delete error:', storageError);

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

  const handleEditImage = async () => {
    if (!editingImage) return;
    try {
      const { error } = await supabase
        .from('marketing_gallery')
        .update({
          title: editTitle,
          player_id: editPlayerId || null,
          focal_point: editFocalPoint,
        })
        .eq('id', editingImage.id);
      if (error) throw error;
      toast.success('Image updated');
      setEditingImage(null);
      fetchGalleryItems();
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to update image');
    }
  };

  const handleDownloadImage = async (item: GalleryItem) => {
    try {
      const link = document.createElement('a');
      const url = item.file_url.includes('supabase.co/storage')
        ? (item.file_url.includes('?') ? `${item.file_url}&download=` : `${item.file_url}?download=`)
        : item.file_url;
      link.href = url;
      link.download = item.title || 'image';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
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

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Collapsible Sections */}
      <Accordion 
        type="multiple" 
        value={openSections} 
        onValueChange={setOpenSections}
        className="space-y-3 sm:space-y-4"
      >
        {/* RESOURCES Section */}
        <AccordionItem value="resources" className="border rounded-lg">
          <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-base sm:text-lg font-semibold">RESOURCES</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <MarketingResources canManage={canManage} />
          </AccordionContent>
        </AccordionItem>

        {/* STRATEGY Section */}
        <AccordionItem value="strategy" className="border rounded-lg">
          <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-base sm:text-lg font-semibold">STRATEGY</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <MarketingStrategy canManage={canManage} />
          </AccordionContent>
        </AccordionItem>

        {/* GALLERY Section */}
        <AccordionItem value="gallery" className="border rounded-lg">
          <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-base sm:text-lg font-semibold">GALLERY</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Marketing Gallery</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Upload and manage images and videos for marketing</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="videos" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4">
                    <TabsTrigger value="images" className="text-xs sm:text-sm">
                      <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Images
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="text-xs sm:text-sm">
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                          <PlayerCombobox
                            players={players as any}
                            value={selectedPlayerId}
                            onChange={setSelectedPlayerId}
                            allLabel="All Players"
                            allValue="all"
                            className="w-full sm:w-[200px]"
                          />
                        )}
                        
                        {canManage && (
                          <Button onClick={() => setShowUploadDialog(true)} size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filtered.map((item) => (
                            <Card key={item.id} className="overflow-hidden">
                              <div className="relative aspect-video bg-muted">
                                <img
                                  src={item.file_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-semibold mb-1">{item.title}</h3>
                                {item.player_id && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Linked: {players.find(p => p.id === item.player_id)?.name || 'Unknown player'}
                                  </p>
                                )}
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => window.open(item.file_url, '_blank')}
                                  >
                                    View Full
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadImage(item)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  {canManage && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingImage(item);
                                        setEditTitle(item.title);
                                        setEditPlayerId(item.player_id);
                                        setEditFocalPoint((item as any).focal_point || 'center');
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
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

                  <TabsContent value="videos" className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <PlayerCombobox
                          players={players as any}
                          value={videoPlayerFilter}
                          onChange={setVideoPlayerFilter}
                          allLabel="All Players"
                          allValue="all"
                          className="w-full sm:w-[200px]"
                        />
                        
                        {canManage && (
                          <>
                            <Button onClick={() => setShowUploadDialog(true)} size="sm">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Video
                            </Button>
                            <Button 
                              onClick={() => {
                                setShowImportDialog(true);
                                fetchPlayerHighlights();
                              }} 
                              size="sm" 
                              variant="outline"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Import from Clips
                            </Button>
                            <Button 
                              onClick={() => setShowCreatePlaylistDialog(true)} 
                              size="sm" 
                              variant="outline"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              New Playlist
                            </Button>
                            <Button 
                              onClick={() => setShowHomepageVideos(true)} 
                              size="sm" 
                              variant="outline"
                            >
                              <List className="w-4 h-4 mr-2" />
                              3D Portfolio
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {(() => {
                      // Filter videos - include those with player_id OR tagged with the selected player
                      const filtered = videoPlayerFilter !== 'all'
                        ? galleryItems.filter(item => {
                            if (item.file_type !== 'video') return false;
                            // Match by player_id OR by tag
                            const matchesPlayerId = item.player_id === videoPlayerFilter;
                            const matchesTags = videoPlayerTags[item.id]?.includes(videoPlayerFilter);
                            return matchesPlayerId || matchesTags;
                          })
                        : galleryItems.filter(item => item.file_type === 'video');
                      
                      return filtered.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">No videos in this category</p>
                          <p className="text-sm">Upload or import videos to build your marketing gallery</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filtered.map((item) => {
                            const taggedPlayerIds = videoPlayerTags[item.id] || [];
                            const taggedPlayerNames = taggedPlayerIds
                              .map(id => players.find(p => p.id === id)?.name)
                              .filter(Boolean);
                            
                            return (
                              <Card key={item.id} className="overflow-hidden">
                                <div className="relative aspect-video bg-muted">
                                  <video
                                    src={item.file_url}
                                    className="w-full h-full object-cover"
                                    controls
                                  />
                                </div>
                                <CardContent className="p-4">
                                  <h3 className="font-semibold mb-1">{item.title}</h3>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                  )}
                                  {taggedPlayerNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {taggedPlayerNames.map((name, idx) => (
                                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
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
                                        variant="outline"
                                        onClick={() => openTagPlayerDialog(item)}
                                        title="Tag Players"
                                      >
                                        <Tag className="w-4 h-4" />
                                      </Button>
                                    )}
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
                            );
                          })}
                        </div>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
                <PlayerCombobox
                  players={players as any}
                  value={uploadForm.player_id || 'none'}
                  onChange={(v) => setUploadForm({ ...uploadForm, player_id: v === 'none' ? null : v })}
                  allLabel="No specific player"
                  allValue="none"
                  placeholder="Select a player"
                />
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
              <Label htmlFor="upload-file">Files *</Label>
              <Input
                id="upload-file"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setUploadForm({ ...uploadForm, files: e.target.files ? Array.from(e.target.files) : [] })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV). Select multiple files at once.
              </p>
              {uploadForm.files.length > 1 && (
                <p className="text-xs text-primary mt-1">{uploadForm.files.length} files selected</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadForm({ title: '', description: '', files: [], category: 'other', player_id: null });
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
            <StaffSearchInput
              value={clipSearchQuery}
              onChange={setClipSearchQuery}
              placeholder="Search clips..."
            />
            {playerHighlights.filter(player => {
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

                  return videos.some((video: any) => {
                    const videoTitle = video?.title || video?.name || '';
                    return videoTitle.toLowerCase().includes(search);
                  });
                }).map((player) => {
                  let highlights = player.highlights as any;

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
            const playerVideos = galleryItems
              .filter(item => item.file_type === 'video' && item.player_id === playlistPlayerData.id)
              .map(item => ({
                id: item.id,
                name: item.title,
                videoUrl: item.file_url
              }));
            
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

      {/* Tag Players Dialog */}
      <Dialog open={showTagPlayerDialog} onOpenChange={setShowTagPlayerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Players</DialogTitle>
            <DialogDescription>
              Select which players should see this video in their portal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium">Video: {selectedVideoForTagging?.title}</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${player.id}`}
                    checked={selectedTagPlayerIds.includes(player.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTagPlayerIds([...selectedTagPlayerIds, player.id]);
                      } else {
                        setSelectedTagPlayerIds(selectedTagPlayerIds.filter(id => id !== player.id));
                      }
                    }}
                  />
                  <label htmlFor={`tag-${player.id}`} className="text-sm cursor-pointer">
                    {player.name}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTagPlayerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveVideoTags}>
                Save Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Create a new video playlist for a player
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playlist-player">Player *</Label>
              <PlayerCombobox
                players={players as any}
                value={newPlaylistPlayerId || null}
                onChange={setNewPlaylistPlayerId}
                placeholder="Select a player"
              />
            </div>
            <div>
              <Label htmlFor="playlist-name">Playlist Name *</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g., Best Goals 2024"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreatePlaylistDialog(false);
                setNewPlaylistName('');
                setNewPlaylistPlayerId('');
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlaylist}>
                Create Playlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Linked Player</Label>
              <PlayerCombobox
                players={players as any}
                value={editPlayerId || 'none'}
                onChange={(v) => setEditPlayerId(v === 'none' ? null : v)}
                allLabel="No player linked"
                allValue="none"
                placeholder="No player linked"
              />
            </div>
            <div>
              <Label>Focal Point (for portal slider)</Label>
              <Select value={editFocalPoint} onValueChange={setEditFocalPoint}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Controls which part of the image shows in the portal hero slider</p>
            </div>
            {editingImage && (
              <div className="relative aspect-video bg-muted rounded overflow-hidden border">
                <img
                  src={editingImage.file_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: editFocalPoint.replace('-', ' ') }}
                />
                <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">Preview</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
              <Button onClick={handleEditImage}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
