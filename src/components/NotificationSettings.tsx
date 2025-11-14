import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferences {
  performance_reports: boolean;
  analyses: boolean;
  programmes: boolean;
  highlights: boolean;
  clips: boolean;
}

interface NotificationSettingsProps {
  playerId: string;
}

export const NotificationSettings = ({ playerId }: NotificationSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    performance_reports: true,
    analyses: true,
    programmes: true,
    highlights: true,
    clips: true,
  });

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open, playerId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          performance_reports: data.performance_reports,
          analyses: data.analyses,
          programmes: data.programmes,
          highlights: data.highlights,
          clips: data.clips,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load notification preferences');
    }
  };

  const updatePreferences = async (key: keyof NotificationPreferences, value: boolean) => {
    setLoading(true);
    try {
      const newPreferences = { ...preferences, [key]: value };
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          player_id: playerId,
          ...newPreferences,
        }, {
          onConflict: 'player_id'
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bebas uppercase text-2xl">
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Choose which notifications you want to receive
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="performance_reports" className="cursor-pointer">
              Performance Reports & R90 Scores
            </Label>
            <Switch
              id="performance_reports"
              checked={preferences.performance_reports}
              onCheckedChange={(checked) => updatePreferences('performance_reports', checked)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="analyses" className="cursor-pointer">
              Match Analyses & Concepts
            </Label>
            <Switch
              id="analyses"
              checked={preferences.analyses}
              onCheckedChange={(checked) => updatePreferences('analyses', checked)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="programmes" className="cursor-pointer">
              Training Programmes
            </Label>
            <Switch
              id="programmes"
              checked={preferences.programmes}
              onCheckedChange={(checked) => updatePreferences('programmes', checked)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="highlights" className="cursor-pointer">
              Match Highlights
            </Label>
            <Switch
              id="highlights"
              checked={preferences.highlights}
              onCheckedChange={(checked) => updatePreferences('highlights', checked)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="clips" className="cursor-pointer">
              Video Clips
            </Label>
            <Switch
              id="clips"
              checked={preferences.clips}
              onCheckedChange={(checked) => updatePreferences('clips', checked)}
              disabled={loading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
