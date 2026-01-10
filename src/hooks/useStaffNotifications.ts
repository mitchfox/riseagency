import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationTrigger {
  onVisitor?: boolean;
  onFormSubmission?: boolean;
  onClipUpload?: boolean;
  onPlaylistChange?: boolean;
}

// Stable empty object to prevent re-renders
const EMPTY_TRIGGERS: NotificationTrigger = {};

export const useStaffNotifications = (triggers: NotificationTrigger = EMPTY_TRIGGERS) => {
  // Skip entirely if no triggers are set
  const hasAnyTrigger = triggers.onVisitor || triggers.onFormSubmission || triggers.onClipUpload || triggers.onPlaylistChange;
  
  // Deferred initialization to prevent React hook errors during PWA cold start
  const [isMounted, setIsMounted] = useState(false);
  const channelsRef = useRef<any[]>([]);
  const hasSetup = useRef(false);

  // First effect: mark component as mounted after initial render (only if we have triggers)
  useEffect(() => {
    if (!hasAnyTrigger) return;
    
    // Use a small delay to ensure React is fully initialized
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 500); // Increased delay for stability
    
    return () => clearTimeout(timer);
  }, [hasAnyTrigger]);

  // Second effect: only set up subscriptions after mounted
  useEffect(() => {
    // Guard: don't run until component is fully mounted or if no triggers
    if (!isMounted || !hasAnyTrigger) return;
    
    // Prevent duplicate setup
    if (hasSetup.current) return;
    hasSetup.current = true;

    const channels: any[] = [];

    // Listen for site visits
    if (triggers.onVisitor) {
      try {
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
      } catch (err) {
        console.error('[Staff Notifications] Failed to subscribe to visitors:', err);
      }
    }

    // Listen for form submissions
    if (triggers.onFormSubmission) {
      try {
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
      } catch (err) {
        console.error('[Staff Notifications] Failed to subscribe to form submissions:', err);
      }
    }

    // Listen for playlist changes
    if (triggers.onPlaylistChange) {
      try {
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
      } catch (err) {
        console.error('[Staff Notifications] Failed to subscribe to playlists:', err);
      }
    }

    // Listen for clip uploads (player highlights changes)
    if (triggers.onClipUpload) {
      try {
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
      } catch (err) {
        console.error('[Staff Notifications] Failed to subscribe to clips:', err);
      }
    }

    channelsRef.current = channels;

    return () => {
      hasSetup.current = false;
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error('[Staff Notifications] Failed to remove channel:', err);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, hasAnyTrigger]);
};
