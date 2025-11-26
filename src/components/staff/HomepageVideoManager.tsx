import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Video, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HomepageVideo {
  id: string;
  video_url: string;
  video_title: string;
  order_position: number;
  is_active: boolean;
}

interface GalleryVideo {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  player_id: string | null;
}

export const HomepageVideoManager = ({ canManage }: { canManage: boolean }) => {
  const [videos, setVideos] = useState<HomepageVideo[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<GalleryVideo[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HomepageVideo | null>(null);
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<GalleryVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
    fetchGalleryVideos();
  }, []);

  const fetchGalleryVideos = async () => {
    const { data, error } = await supabase
      .from('marketing_gallery')
      .select('id, title, file_url, thumbnail_url, player_id')
      .eq('file_type', 'video')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load gallery videos:', error);
    } else {
      setGalleryVideos(data || []);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('homepage_videos')
      .select('*')
      .order('order_position', { ascending: true });

    if (error) {
      toast.error('Failed to load videos');
      console.error(error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGalleryVideo) {
      toast.error('Please select a video from the gallery');
      return;
    }

    if (editingVideo) {
      const { error } = await supabase
        .from('homepage_videos')
        .update({
          video_url: selectedGalleryVideo.file_url,
          video_title: selectedGalleryVideo.title,
        })
        .eq('id', editingVideo.id);

      if (error) {
        toast.error('Failed to update video');
        console.error(error);
        return;
      }

      toast.success('Video updated');
    } else {
      const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.order_position)) : 0;
      
      const { error } = await supabase
        .from('homepage_videos')
        .insert({
          video_url: selectedGalleryVideo.file_url,
          video_title: selectedGalleryVideo.title,
          order_position: maxOrder + 1,
        });

      if (error) {
        toast.error('Failed to add video');
        console.error(error);
        return;
      }

      toast.success('Video added');
    }

    setShowDialog(false);
    setEditingVideo(null);
    setSelectedGalleryVideo(null);
    setSearchQuery('');
    fetchVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    const { error } = await supabase
      .from('homepage_videos')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete video');
      console.error(error);
      return;
    }

    toast.success('Video deleted');
    fetchVideos();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('homepage_videos')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update video status');
      console.error(error);
      return;
    }

    toast.success(currentState ? 'Video hidden' : 'Video activated');
    fetchVideos();
  };

  const moveVideo = async (index: number, direction: 'up' | 'down') => {
    const newVideos = [...videos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newVideos.length) return;

    [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];

    const updates = newVideos.map((video, i) => ({
      id: video.id,
      order_position: i + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('homepage_videos')
        .update({ order_position: update.order_position })
        .eq('id', update.id);
    }

    toast.success('Order updated');
    fetchVideos();
  };

  const openEditDialog = (video: HomepageVideo) => {
    setEditingVideo(video);
    // Find the gallery video that matches this URL
    const matchingGalleryVideo = galleryVideos.find(gv => gv.file_url === video.video_url);
    setSelectedGalleryVideo(matchingGalleryVideo || null);
    setSearchQuery('');
    setShowDialog(true);
  };

  const openAddDialog = () => {
    setEditingVideo(null);
    setSelectedGalleryVideo(null);
    setSearchQuery('');
    setShowDialog(true);
  };

  const filteredGalleryVideos = galleryVideos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canManage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" />
            3D Portfolio Videos
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage videos shown in the 3D video grid on the homepage
          </p>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>
      
      <div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No videos yet. Add your first video to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex sm:flex-col gap-2 sm:gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveVideo(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveVideo(index, 'down')}
                    disabled={index === videos.length - 1}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="font-medium truncate">{video.video_title}</div>
                  <div className="text-sm text-muted-foreground truncate">{video.video_url}</div>
                  <div className="text-xs text-muted-foreground mt-1">Position: {video.order_position}</div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-start gap-2 px-2 sm:px-0">
                    <Label htmlFor={`active-${video.id}`} className="text-xs whitespace-nowrap">
                      {video.is_active ? 'Active' : 'Hidden'}
                    </Label>
                    <Switch
                      id={`active-${video.id}`}
                      checked={video.is_active}
                      onCheckedChange={() => toggleActive(video.id, video.is_active)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(video)}
                      className="flex-1 sm:flex-none"
                    >
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(video.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="space-y-2">
              <Label>Search Videos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by video title..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <Label>Select Video from Gallery</Label>
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-3 space-y-2">
                  {filteredGalleryVideos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No videos found in gallery</p>
                      <p className="text-sm mt-1">Upload videos to the Marketing Gallery first</p>
                    </div>
                  ) : (
                    filteredGalleryVideos.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => setSelectedGalleryVideo(video)}
                        className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedGalleryVideo?.id === video.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex gap-2 items-start">
                          {video.thumbnail_url && (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-20 h-12 sm:w-24 sm:h-14 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{video.title}</div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {video.file_url}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {selectedGalleryVideo && (
              <div className="p-2 bg-accent/50 rounded-lg">
                <p className="text-sm font-medium truncate">Selected: {selectedGalleryVideo.title}</p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedGalleryVideo}>
                {editingVideo ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
