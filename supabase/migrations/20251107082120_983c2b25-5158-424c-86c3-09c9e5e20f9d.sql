-- Add public read access to performance report actions
CREATE POLICY "Anyone can view performance report actions"
ON performance_report_actions
FOR SELECT
USING (true);