import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, MapPin, Clock, RefreshCw } from "lucide-react";

interface SiteVisit {
  id: string;
  visitor_id: string;
  page_path: string;
  duration: number;
  location: any;
  user_agent: string;
  referrer: string | null;
  visited_at: string;
}

export const SiteVisitorsManagement = () => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uniquePaths, setUniquePaths] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    avgDuration: 0,
  });

  const loadVisits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("site_visits")
        .select("*")
        .order("visited_at", { ascending: false })
        .limit(100);

      if (pageFilter !== "all") {
        query = query.eq("page_path", pageFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVisits(data || []);
      
      // Calculate stats
      const uniqueVisitorIds = new Set(data?.map((v) => v.visitor_id) || []);
      const totalDuration = data?.reduce((acc, v) => acc + (v.duration || 0), 0) || 0;
      
      setStats({
        totalVisits: data?.length || 0,
        uniqueVisitors: uniqueVisitorIds.size,
        avgDuration: data?.length ? Math.round(totalDuration / data.length) : 0,
      });
    } catch (error) {
      console.error("Error loading visits:", error);
      toast.error("Failed to load site visits");
    } finally {
      setLoading(false);
    }
  };

  const loadUniquePaths = async () => {
    try {
      const { data, error } = await supabase
        .from("site_visits")
        .select("page_path")
        .order("page_path");

      if (error) throw error;

      const paths = Array.from(new Set(data?.map((v) => v.page_path) || []));
      setUniquePaths(paths);
    } catch (error) {
      console.error("Error loading paths:", error);
    }
  };

  useEffect(() => {
    loadVisits();
    loadUniquePaths();
  }, [pageFilter]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatLocation = (location: any) => {
    if (!location || Object.keys(location).length === 0) return "Unknown";
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);
    return parts.join(", ") || "Unknown";
  };

  const filteredVisits = visits.filter((visit) =>
    visit.page_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatLocation(visit.location).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueVisitors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Site Visitors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by path, visitor ID, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-1/2"
            />
            
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="md:w-1/3">
                <SelectValue placeholder="Filter by page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {uniquePaths.map((path) => (
                  <SelectItem key={path} value={path}>
                    {path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={loadVisits}
              disabled={loading}
              variant="outline"
              className="md:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Visits Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor ID</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Visited At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No visits found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-mono text-xs">
                        {visit.visitor_id.substring(0, 16)}...
                      </TableCell>
                      <TableCell className="font-medium">{visit.page_path}</TableCell>
                      <TableCell>{formatDuration(visit.duration)}</TableCell>
                      <TableCell>{formatLocation(visit.location)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {visit.referrer || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(visit.visited_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
