import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Video } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface HomepageVideo {
  id: string;
  video_url: string;
  video_title: string;
  order_position: number;
  is_active: boolean;
}

export const HomepageVideoManager = ({ canManage }: { canManage: boolean }) => {
  const [videos, setVideos] = useState<HomepageVideo[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HomepageVideo | null>(null);
  const [formData, setFormData] = useState({
    video_url: '',
    video_title: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

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

    if (!formData.video_url || !formData.video_title) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingVideo) {
      const { error } = await supabase
        .from('homepage_videos')
        .update({
          video_url: formData.video_url,
          video_title: formData.video_title,
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
          video_url: formData.video_url,
          video_title: formData.video_title,
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
    setFormData({ video_url: '', video_title: '' });
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
    setFormData({
      video_url: video.video_url,
      video_title: video.video_title,
    });
    setShowDialog(true);
  };

  const openAddDialog = () => {
    setEditingVideo(null);
    setFormData({ video_url: '', video_title: '' });
    setShowDialog(true);
  };

  if (!canManage) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              3D Portfolio Videos
            </CardTitle>
            <CardDescription>
              Manage videos shown in the 3D video grid on the homepage
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveVideo(index, 'up')}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveVideo(index, 'down')}
                    disabled={index === videos.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{video.video_title}</div>
                  <div className="text-sm text-muted-foreground truncate">{video.video_url}</div>
                  <div className="text-xs text-muted-foreground mt-1">Position: {video.order_position}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${video.id}`} className="text-xs">
                      {video.is_active ? 'Active' : 'Hidden'}
                    </Label>
                    <Switch
                      id={`active-${video.id}`}
                      checked={video.is_active}
                      onCheckedChange={() => toggleActive(video.id, video.is_active)}
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(video)}
                  >
                    Edit
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(video.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="video_title">Video Title</Label>
              <Input
                id="video_title"
                value={formData.video_title}
                onChange={(e) => setFormData({ ...formData, video_title: e.target.value })}
                placeholder="e.g., Player Highlights"
                required
              />
            </div>
            <div>
              <Label htmlFor="video_url">Video URL</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="YouTube embed URL with autoplay parameters"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&controls=0&loop=1&playlist=VIDEO_ID
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVideo ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
