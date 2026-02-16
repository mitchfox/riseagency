import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ActivityEntry {
  id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: any;
  created_at: string;
}

const ACTION_COLOURS: Record<string, string> = {
  created: "bg-green-500/10 text-green-600 border-green-500/30",
  updated: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  deleted: "bg-red-500/10 text-red-600 border-red-500/30",
};

export const ActivityLog = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchEntries();
  }, [actionFilter, entityFilter, page]);

  const fetchEntries = async () => {
    setLoading(true);
    let query = supabase
      .from("staff_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);

    const { data, error } = await query;
    if (!error && data) setEntries(data);
    setLoading(false);
  };

  const filteredEntries = staffFilter
    ? entries.filter(e => e.user_email?.toLowerCase().includes(staffFilter.toLowerCase()))
    : entries;

  const entityTypes = [...new Set(entries.map(e => e.entity_type))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">ACTIVITY LOG</h2>
        <p className="text-muted-foreground">Chronological feed of staff actions across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by staff email..."
          value={staffFilter}
          onChange={e => setStaffFilter(e.target.value)}
          className="w-full sm:w-[250px]"
        />

        <Button variant="outline" size="icon" onClick={() => fetchEntries()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{entry.user_email || 'Unknown'}</span>
                  <Badge variant="outline" className={`text-xs ${ACTION_COLOURS[entry.action] || ''}`}>
                    {entry.action}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">{entry.entity_type}</Badge>
                </div>
                {entry.entity_name && (
                  <p className="text-sm text-muted-foreground truncate">{entry.entity_name}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
        <Button variant="outline" size="sm" disabled={entries.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};
