import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationTrigger {
  onVisitor?: boolean;
  onFormSubmission?: boolean;
  onClipUpload?: boolean;
  onPlaylistChange?: boolean;
}

export const useStaffNotifications = (triggers: NotificationTrigger = {}) => {
  useEffect(() => {
    const channels: any[] = [];

    // Listen for site visits
    if (triggers.onVisitor) {
      const visitorChannel = supabase
        .channel('site_visits_staff')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'site_visits',
          },
          async (payload) => {
            console.log('[Staff Notifications] New visitor:', payload);
            
            // Send notification to all staff
            await supabase.functions.invoke('notify-staff', {
              body: {
                event_type: 'visitor',
                title: 'New Site Visitor',
                body: `A visitor accessed ${payload.new.page_path}`,
                data: {
                  page: payload.new.page_path,
                  timestamp: payload.new.visited_at,
                }
              }
            });
          }
        )
        .subscribe();
      
      channels.push(visitorChannel);
    }

    // Listen for form submissions
    if (triggers.onFormSubmission) {
      const formChannel = supabase
        .channel('form_submissions_staff')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'form_submissions',
          },
          async (payload) => {
            console.log('[Staff Notifications] New form submission:', payload);
            
            await supabase.functions.invoke('notify-staff', {
              body: {
                event_type: 'form_submission',
                title: 'New Form Submission',
                body: `${payload.new.form_type} form submitted`,
                data: {
                  form_type: payload.new.form_type,
                  timestamp: payload.new.created_at,
                }
              }
            });
          }
        )
        .subscribe();
      
      channels.push(formChannel);
    }

    // Listen for playlist changes
    if (triggers.onPlaylistChange) {
      const playlistChannel = supabase
        .channel('playlists_staff')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'playlists',
          },
          async (payload) => {
            console.log('[Staff Notifications] Playlist change:', payload);
            
            const eventType = payload.eventType;
            const playlistName = (payload.new as any)?.name || (payload.old as any)?.name || 'Unknown';
            const playlistId = (payload.new as any)?.id || (payload.old as any)?.id;
            
            const title = eventType === 'INSERT' ? 'New Playlist Created' : 
                         eventType === 'UPDATE' ? 'Playlist Updated' : 'Playlist Deleted';
            
            await supabase.functions.invoke('notify-staff', {
              body: {
                event_type: 'playlist_change',
                title,
                body: `Playlist: ${playlistName}`,
                data: {
                  playlist_id: playlistId,
                  event: eventType,
                }
              }
            });
          }
        )
        .subscribe();
      
      channels.push(playlistChannel);
    }

    // Listen for clip uploads (player highlights changes)
    if (triggers.onClipUpload) {
      const clipChannel = supabase
        .channel('player_highlights_staff')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'players',
          },
          async (payload) => {
            // Check if highlights were updated
            const oldHighlights = payload.old?.highlights;
            const newHighlights = payload.new?.highlights;
            
            if (JSON.stringify(oldHighlights) !== JSON.stringify(newHighlights)) {
              console.log('[Staff Notifications] Clip uploaded:', payload);
              
              const playerName = (payload.new as any)?.name || 'Unknown';
              
              await supabase.functions.invoke('notify-staff', {
                body: {
                  event_type: 'clip_upload',
                  title: 'New Clip Uploaded',
                  body: `New highlight added for ${playerName}`,
                  data: {
                    player_id: (payload.new as any)?.id,
                    player_name: playerName,
                  }
                }
              });
            }
          }
        )
        .subscribe();
      
      channels.push(clipChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [triggers.onVisitor, triggers.onFormSubmission, triggers.onClipUpload, triggers.onPlaylistChange]);
};
