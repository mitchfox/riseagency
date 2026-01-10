import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ExternalLink, Clock, MapPin, Users } from "lucide-react";

interface Job {
  id: string;
  title: string;
  department: string;
  location: string | null;
  description: string | null;
  type: string | null;
  is_active: boolean;
  created_at: string;
}

export const JobsManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    };

    fetchJobs();
  }, []);

  if (loading) {
    return <div className="p-4">Loading jobs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Listings</h2>
          <p className="text-sm text-muted-foreground">
            Manage job postings displayed on the public Jobs page
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/jobs" target="_blank">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Public Page
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No job listings yet</p>
              <p className="text-sm">Add jobs directly in the database to display them here</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className={!job.is_active ? "opacity-50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {job.title}
                      {!job.is_active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {job.department}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.type && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {job.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        To add or edit jobs, update the 'jobs' table in the database directly
      </p>
    </div>
  );
};
