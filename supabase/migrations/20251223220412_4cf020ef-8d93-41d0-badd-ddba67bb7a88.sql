-- Add new notification event types to settings for each role
INSERT INTO staff_notification_settings (role, event_type, enabled) VALUES
('admin', 'calendar_event', true),
('admin', 'task_assigned', true),
('admin', 'task_completed', true),
('admin', 'goal_added', true),
('staff', 'calendar_event', true),
('staff', 'task_assigned', true),
('staff', 'task_completed', true),
('staff', 'goal_added', true),
('marketeer', 'calendar_event', true),
('marketeer', 'task_assigned', true),
('marketeer', 'task_completed', true),
('marketeer', 'goal_added', true)
ON CONFLICT (role, event_type) DO NOTHING;