-- Add status field to player_test_results for draft/submitted functionality
ALTER TABLE public.player_test_results 
ADD COLUMN status text NOT NULL DEFAULT 'submitted';

-- Add index for efficient querying by status
CREATE INDEX idx_player_test_results_status ON public.player_test_results(status);

-- Update existing records to be 'submitted'
UPDATE public.player_test_results SET status = 'submitted' WHERE status IS NULL;