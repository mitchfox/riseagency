import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Eye, MapPin, Clock, RefreshCw, EyeOff, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SiteVisit {
  id: string;
  visitor_id: string;
  page_path: string;
  duration: number;
  location: any;
  user_agent: string;
  referrer: string | null;
  visited_at: string;
  hidden: boolean;
}

export const SiteVisitorsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [referrerFilter, setReferrerFilter] = useState<string>("instagram");
  const [searchTerm, setSearchTerm] = useState("");
  const [uniquePaths, setUniquePaths] = useState<string[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [visitorDetails, setVisitorDetails] = useState<SiteVisit[]>([]);
  const [showUniqueOnly, setShowUniqueOnly] = useState(true); // Default to true
  const [showHidden, setShowHidden] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default to today
  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    avgDuration: 0,
  });
  const [allTimeStats, setAllTimeStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    avgDuration: 0,
  });

  const loadVisits = async () => {
    setLoading(true);
    try {
      // Get start and end of selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from("site_visits")
        .select("*")
        .gte("visited_at", startOfDay.toISOString())
        .lte("visited_at", endOfDay.toISOString())
        .order("visited_at", { ascending: false });

      if (pageFilter !== "all") {
        query = query.eq("page_path", pageFilter);
      }

      // Only filter by hidden status when not showing hidden visitors
      if (!showHidden) {
        query = query.eq("hidden", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVisits(data || []);
      
      // Calculate daily stats (excluding 0-duration visits from average)
      const uniqueVisitorIds = new Set(data?.map((v) => v.visitor_id) || []);
      const visitsWithDuration = data?.filter(v => v.duration > 0) || [];
      const totalDuration = visitsWithDuration.reduce((acc, v) => acc + v.duration, 0);
      
      setStats({
        totalVisits: data?.length || 0,
        uniqueVisitors: uniqueVisitorIds.size,
        avgDuration: visitsWithDuration.length ? Math.round(totalDuration / visitsWithDuration.length) : 0,
      });

      // Load all-time stats - use count for total visits
      let countQuery = supabase
        .from("site_visits")
        .select("*", { count: 'exact', head: false });

      // Only filter by hidden status when not showing hidden visitors
      if (!showHidden) {
        countQuery = countQuery.eq("hidden", false);
      }

      const { data: allTimeData, error: allTimeError, count: totalCount } = await countQuery;

      if (allTimeError) throw allTimeError;

      const allTimeUniqueVisitors = new Set(allTimeData?.map((v) => v.visitor_id) || []);
      const allTimeVisitsWithDuration = allTimeData?.filter(v => v.duration > 0) || [];
      const allTimeTotalDuration = allTimeVisitsWithDuration.reduce((acc, v) => acc + v.duration, 0);

      setAllTimeStats({
        totalVisits: totalCount || 0,
        uniqueVisitors: allTimeUniqueVisitors.size,
        avgDuration: allTimeVisitsWithDuration.length ? Math.round(allTimeTotalDuration / allTimeVisitsWithDuration.length) : 0,
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

  const loadVisitorDetails = async (visitorId: string) => {
    try {
      const { data, error } = await supabase
        .from("site_visits")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("visited_at", { ascending: false });

      if (error) throw error;

      // Group by page and take the entry with highest duration for each page
      const pageMap = new Map<string, SiteVisit>();
      data?.forEach((visit) => {
        const existing = pageMap.get(visit.page_path);
        if (!existing || visit.duration > existing.duration) {
          pageMap.set(visit.page_path, visit);
        }
      });

      setVisitorDetails(Array.from(pageMap.values()));
    } catch (error) {
      console.error("Error loading visitor details:", error);
      toast.error("Failed to load visitor details");
    }
  };

  useEffect(() => {
    loadVisits();
    loadUniquePaths();
  }, [pageFilter, showHidden, selectedDate]);

  const hideVisitor = async (visitorId: string) => {
    try {
      const { error } = await supabase
        .from("site_visits")
        .update({ hidden: true })
        .eq("visitor_id", visitorId);

      if (error) throw error;

      toast.success("Visitor hidden successfully");
      setSelectedVisitor(null);
      setVisitorDetails([]);
      loadVisits();
    } catch (error) {
      console.error("Error hiding visitor:", error);
      toast.error("Failed to hide visitor");
    }
  };

  const unhideVisitor = async (visitorId: string) => {
    try {
      const { error } = await supabase
        .from("site_visits")
        .update({ hidden: false })
        .eq("visitor_id", visitorId);

      if (error) throw error;

      toast.success("Visitor unhidden successfully");
      setSelectedVisitor(null);
      setVisitorDetails([]);
      loadVisits();
    } catch (error) {
      console.error("Error unhiding visitor:", error);
      toast.error("Failed to unhide visitor");
    }
  };

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

  const filteredVisits = visits.filter((visit) => {
    // Filter out specific visitor IDs and Bedford, England location
    if (visit.visitor_id === "visitor_1761434517054_gd6h507zq") return false;
    
    const location = formatLocation(visit.location);
    if (location.includes("Bedford") && location.includes("England")) return false;
    
    // Filter by referrer (Instagram, LinkedIn, Google, etc.)
    if (referrerFilter !== "all") {
      const referrer = (visit.referrer || "").toLowerCase();
      if (referrerFilter === "instagram" && !referrer.includes("instagram")) return false;
      if (referrerFilter === "linkedin" && !referrer.includes("linkedin")) return false;
      if (referrerFilter === "google" && !referrer.includes("google")) return false;
      if (referrerFilter === "direct" && visit.referrer) return false;
    }
    
    // Filter by search term
    const searchMatch = 
      visit.page_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  // Filter to show unique visitors only if checkbox is enabled
  const displayedVisits = showUniqueOnly
    ? filteredVisits.reduce((acc, visit) => {
        // Only keep the first visit per visitor_id
        if (!acc.find(v => v.visitor_id === visit.visitor_id)) {
          acc.push(visit);
        }
        return acc;
      }, [] as SiteVisit[])
    : filteredVisits;

  // Calculate total duration per visitor across all their visits
  const visitorDurations = new Map<string, number>();
  visits.forEach(visit => {
    const current = visitorDurations.get(visit.visitor_id) || 0;
    visitorDurations.set(visit.visitor_id, current + visit.duration);
  });

  const getVisitorTotalDuration = (visitorId: string) => {
    return visitorDurations.get(visitorId) || 0;
  };

  if (selectedVisitor) {
    const isVisitorHidden = visitorDetails.length > 0 && visitorDetails[0].hidden;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedVisitor(null);
              setVisitorDetails([]);
            }}
          >
            ← Back to All Visitors
          </Button>

          {isVisitorHidden ? (
            <Button
              variant="default"
              onClick={() => unhideVisitor(selectedVisitor)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Unhide Visitor
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => hideVisitor(selectedVisitor)}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Visitor
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg break-words">
              Visitor Details: <span className="block sm:inline text-sm sm:text-base">{selectedVisitor}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ScrollArea className="w-full h-[500px]">
              <div className="rounded-md border min-w-full">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Page Path</TableHead>
                    <TableHead className="text-xs sm:text-sm">Duration</TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Location</TableHead>
                    <TableHead className="text-xs sm:text-sm">Visited At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitorDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No visits found for this visitor
                      </TableCell>
                    </TableRow>
                  ) : (
                    visitorDetails.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{visit.page_path}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{formatDuration(visit.duration)}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatLocation(visit.location)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(visit.visited_at).toLocaleString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* All-Time Stats Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">All Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allTimeStats.totalVisits}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allTimeStats.uniqueVisitors}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(allTimeStats.avgDuration)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Stats Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {format(selectedDate, "MMMM d, yyyy")}
        </h3>
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{showHidden ? "Hidden Visitors" : "Site Visitors"}</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showHidden"
                checked={showHidden}
                onCheckedChange={(checked) => setShowHidden(checked as boolean)}
              />
              <label
                htmlFor="showHidden"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show hidden visitors
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by path, visitor ID, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-1/4"
            />
            
            <Select value={referrerFilter} onValueChange={setReferrerFilter}>
              <SelectTrigger className="md:w-1/4">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="direct">Direct (No Referrer)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="md:w-1/4">
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

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "md:w-1/4 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

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

          {/* Unique Visitors Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uniqueVisitors"
              checked={showUniqueOnly}
              onCheckedChange={(checked) => setShowUniqueOnly(checked as boolean)}
            />
            <label
              htmlFor="uniqueVisitors"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show unique visitors only
            </label>
          </div>

          {/* Visits Table */}
          <ScrollArea className="w-full h-[500px]">
            <div className="rounded-md border min-w-[800px]">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor ID</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Entry Site</TableHead>
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
                ) : displayedVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No visits found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedVisits.map((visit) => (
                    <TableRow 
                      key={visit.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedVisitor(visit.visitor_id);
                        loadVisitorDetails(visit.visitor_id);
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {visit.visitor_id.substring(0, 16)}...
                      </TableCell>
                      <TableCell className="font-medium">{visit.page_path}</TableCell>
                      <TableCell>{formatDuration(getVisitorTotalDuration(visit.visitor_id))}</TableCell>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
