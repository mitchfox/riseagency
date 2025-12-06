import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, FileText, Users, TrendingUp, MessageSquare, Plus, Loader2, Search, Edit, Phone, Mail, User, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ClubOutreachManagement } from "./ClubOutreachManagement";

interface Player {
  id: string;
  name: string;
  position: string;
  club: string | null;
  nationality: string;
  age: number;
  representation_status: string | null;
}

interface AgentNote {
  id: string;
  player_id: string;
  note_type: string;
  content: string;
  created_at: string;
}

interface ContractInfo {
  player_id: string;
  contract_end_date: string | null;
  contract_status: string;
  market_value: string | null;
  notes: string | null;
}

export const TransferHub = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("outreach");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, position, club, nationality, age, representation_status")
      .order("name");

    if (!error) {
      setPlayers(data || []);
    }
    setLoading(false);
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.club?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Transfer Hub
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage player transfers, club outreach, and market activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-2 bg-muted">
          <TabsTrigger value="outreach" className="font-medium text-sm">
            <Building2 className="h-4 w-4 mr-2" />
            Club Outreach
          </TabsTrigger>
          <TabsTrigger value="roster" className="font-medium text-sm">
            <Users className="h-4 w-4 mr-2" />
            Player Roster
          </TabsTrigger>
          <TabsTrigger value="market" className="font-medium text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Market Status
          </TabsTrigger>
          <TabsTrigger value="contracts" className="font-medium text-sm">
            <FileText className="h-4 w-4 mr-2" />
            Contract Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outreach" className="mt-6">
          <ClubOutreachManagement />
        </TabsContent>

        <TabsContent value="roster" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Roster Overview
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
                      <TableHead>Position</TableHead>
                      <TableHead>Current Club</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedPlayer === "all" ? filteredPlayers : filteredPlayers.filter(p => p.id === selectedPlayer)).map(player => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.position}</TableCell>
                        <TableCell>{player.club || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            player.representation_status === 'active' ? 'bg-green-500/20 text-green-400' :
                            player.representation_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-muted text-muted-foreground'
                          }>
                            {player.representation_status || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>{player.age}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Market Intelligence</p>
                <p className="text-sm">Track transfer market activity, rumours, and valuations for your players.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Current Club</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Representation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedPlayer === "all" ? filteredPlayers : filteredPlayers.filter(p => p.id === selectedPlayer)).map(player => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.club || "-"}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {player.representation_status || 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
