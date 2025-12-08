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
import { TransferStatusManagement } from "./TransferStatusManagement";
import { AgentNotesManagement } from "./AgentNotesManagement";

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 md:h-6 md:w-6" />
            Transfer Hub
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage player transfers, club outreach, and market activity
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-full md:grid md:grid-cols-5 gap-1 h-auto p-1 bg-muted min-w-full">
            <TabsTrigger value="outreach" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <Building2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Club </span>Outreach
            </TabsTrigger>
            <TabsTrigger value="roster" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="market" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Transfer </span>Status
            </TabsTrigger>
            <TabsTrigger value="notes" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="contracts" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Contracts
            </TabsTrigger>
          </TabsList>
        </div>

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
          <TransferStatusManagement players={players} selectedPlayer={selectedPlayer} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <AgentNotesManagement players={players} selectedPlayer={selectedPlayer} />
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
