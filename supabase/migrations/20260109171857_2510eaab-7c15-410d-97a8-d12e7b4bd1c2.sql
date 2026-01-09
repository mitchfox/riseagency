-- Create jobs table for career postings
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  location TEXT DEFAULT 'Remote',
  type TEXT DEFAULT 'Full-time',
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  salary_range TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for active jobs
CREATE POLICY "Public can view active jobs"
ON public.jobs
FOR SELECT
USING (is_active = true);

-- Authenticated users can manage jobs
CREATE POLICY "Authenticated users can manage jobs"
ON public.jobs
FOR ALL
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample jobs
INSERT INTO public.jobs (title, department, location, type, description, requirements, responsibilities, is_active)
VALUES 
  ('Football Scout', 'Scouting', 'Europe (Remote)', 'Part-time', 
   'We are looking for experienced scouts to join our European scouting network. You will identify and evaluate talented players across your region.',
   'Minimum 3 years scouting experience at professional level. Strong network in local football. Excellent analytical skills and knowledge of player development.',
   'Attend matches and training sessions. Produce detailed player reports. Maintain relationships with clubs and academies. Contribute to our scouting database.',
   true),
  ('Performance Analyst', 'Performance', 'London, UK', 'Full-time',
   'Join our performance team to provide data-driven insights for player development. Work directly with our roster of professional players.',
   'Degree in Sports Science or related field. Experience with video analysis software (Wyscout, InStat). Strong understanding of football tactics.',
   'Conduct match analysis for players. Create development reports. Work with coaching staff. Maintain performance database.',
   true),
  ('Marketing Coordinator', 'Marketing', 'Remote', 'Full-time',
   'Manage social media presence and content creation for our agency and players. Create engaging content that builds player brands.',
   'Experience in sports marketing. Strong creative skills. Understanding of social media platforms. Video editing skills preferred.',
   'Manage social media accounts. Create player content. Coordinate with media partners. Support brand partnerships.',
   true);