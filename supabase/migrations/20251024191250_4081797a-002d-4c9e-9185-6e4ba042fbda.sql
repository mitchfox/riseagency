-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to update player stats daily at midnight (UTC)
SELECT cron.schedule(
  'update-tyrese-stats-daily',
  '0 0 * * *', -- Run at midnight every day
  $$
  SELECT
    net.http_post(
        url:='https://qwethimbtaamlhbajmal.supabase.co/functions/v1/update-player-stats',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXRoaW1idGFhbWxoYmFqbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODQzNDMsImV4cCI6MjA3NjM2MDM0M30.FNM354bgxhdtM4F_KGbQQnJwX7-WngaX58kPvPYnUEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
