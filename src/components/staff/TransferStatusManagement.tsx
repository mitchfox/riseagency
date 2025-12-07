import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  name: string;
  position: string;
  club: string | null;
  transfer_status?: string;
  transfer_priority?: string;
}

interface TransferStatusManagementProps {
  players: Player[];
  selectedPlayer: string;
}

const STATUS_OPTIONS = [
  { value: "actively_marketed", label: "Actively Marketed" },
  { value: "open_to_offers", label: "Open to Offers" },
  { value: "not_available", label: "Not Available" },
  { value: "contract_talks", label: "In Contract Talks" },
  { value: "loan_available", label: "Loan Available" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High Priority" },
  { value: "standard", label: "Standard" },
  { value: "low", label: "Low Priority" },
  { value: "monitoring", label: "Monitoring Only" },
];

export const TransferStatusManagement = ({ players, selectedPlayer }: TransferStatusManagementProps) => {
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, { status: string; priority: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerStatuses();
  }, []);

  const fetchPlayerStatuses = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, transfer_status, transfer_priority");

    if (!error && data) {
      const statuses: Record<string, { status: string; priority: string }> = {};
      data.forEach(p => {
        statuses[p.id] = {
          status: p.transfer_status || "actively_marketed",
          priority: p.transfer_priority || "standard"
        };
      });
      setPlayerStatuses(statuses);
    }
    setLoading(false);
  };

  const handleStatusChange = (playerId: string, field: "status" | "priority", value: string) => {
    setPlayerStatuses(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const savePlayerStatus = async (playerId: string) => {
    setSaving(playerId);
    const { status, priority } = playerStatuses[playerId] || {};
    
    const { error } = await supabase
      .from("players")
      .update({
        transfer_status: status,
        transfer_priority: priority
      })
      .eq("id", playerId);

    if (error) {
      toast.error("Failed to save status");
    } else {
      toast.success("Transfer status updated");
    }
    setSaving(null);
  };

  const filteredPlayers = selectedPlayer === "all" 
    ? players 
    : players.filter(p => p.id === selectedPlayer);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "actively_marketed": return "bg-green-500/20 text-green-400";
      case "open_to_offers": return "bg-blue-500/20 text-blue-400";
      case "not_available": return "bg-red-500/20 text-red-400";
      case "contract_talks": return "bg-yellow-500/20 text-yellow-400";
      case "loan_available": return "bg-purple-500/20 text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400";
      case "standard": return "bg-blue-500/20 text-blue-400";
      case "low": return "bg-gray-500/20 text-gray-400";
      case "monitoring": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Transfer Status Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Current Club</TableHead>
                <TableHead>Transfer Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(player => {
                const playerData = playerStatuses[player.id] || { status: "actively_marketed", priority: "standard" };
                return (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.club || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={playerData.status}
                        onValueChange={(v) => handleStatusChange(player.id, "status", v)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <Badge variant="outline" className={getStatusBadgeClass(opt.value)}>
                                {opt.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={playerData.priority}
                        onValueChange={(v) => handleStatusChange(player.id, "priority", v)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <Badge variant="outline" className={getPriorityBadgeClass(opt.value)}>
                                {opt.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => savePlayerStatus(player.id)}
                        disabled={saving === player.id}
                      >
                        {saving === player.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
