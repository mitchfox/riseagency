
-- Create triggers for existing trigger functions
CREATE TRIGGER trg_form_submission_notification
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_form_submission_notification();

CREATE TRIGGER trg_playlist_change_notification
  AFTER INSERT OR UPDATE OR DELETE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.log_playlist_change_notification();

CREATE TRIGGER trg_clip_upload_notification
  AFTER UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.log_clip_upload_notification();
