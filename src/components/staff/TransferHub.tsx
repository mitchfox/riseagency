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
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { ClubOutreachManagement } from "./ClubOutreachManagement";
import { TransferStatusManagement } from "./TransferStatusManagement";
import { AgentNotesManagement } from "./AgentNotesManagement";
import { fetchClubContactRows, groupRowsByPlayer, type ClubContactRow } from "@/lib/transferHubData";
import { PlayerClubContactList } from "@/components/transferhub/PlayerClubContactList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [contactRows, setContactRows] = useState<ClubContactRow[]>([]);
  const [expandedRosterPlayer, setExpandedRosterPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchClubContactRows(null).then(setContactRows).catch(() => setContactRows([]));
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

  const contactsByPlayer = groupRowsByPlayer(contactRows);

  const refreshContacts = () => {
    fetchClubContactRows(null).then(setContactRows).catch(() => undefined);
  };

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
              Club Outreach
            </TabsTrigger>
            <TabsTrigger value="roster" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="market" className="font-medium text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Transfer Status
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
                <LoadingSpinner size="md" className="py-8" />
              ) : (
                <div className="space-y-2">
                  {(selectedPlayer === "all" ? filteredPlayers : filteredPlayers.filter(p => p.id === selectedPlayer)).map(player => {
                    const info = contactsByPlayer.get(player.id);
                    const count = info?.count || 0;
                    const last = info?.last || null;
                    const open = expandedRosterPlayer === player.id;
                    return (
                      <Collapsible
                        key={player.id}
                        open={open}
                        onOpenChange={(o) => setExpandedRosterPlayer(o ? player.id : null)}
                      >
                        <div className="border rounded-md overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button type="button" className="w-full text-left hover:bg-muted/30 transition-colors">
                              <div className="grid grid-cols-12 gap-3 items-center p-3">
                                <div className="col-span-3 font-medium truncate">{player.name}</div>
                                <div className="col-span-2 text-sm text-muted-foreground truncate">{player.position}</div>
                                <div className="col-span-2 text-sm truncate">{player.club || "—"}</div>
                                <div className="col-span-2">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={count > 0 ? { borderColor: "#C6A332", color: "#C6A332" } : undefined}
                                  >
                                    {count > 0 ? `${count} club${count === 1 ? "" : "s"} contacted` : "No outreach"}
                                  </Badge>
                                </div>
                                <div className="col-span-2 text-xs text-muted-foreground truncate">
                                  {last ? (
                                    <>
                                      <span>{last.club_name}</span>
                                      {last.last_contacted_at && (
                                        <span className="ml-1">· {format(new Date(last.last_contacted_at), "d MMM")}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t bg-muted/10 p-3">
                              <PlayerClubContactList
                                rows={info?.rows || []}
                                onChanged={refreshContacts}
                                emptyMessage="No clubs have been contacted for this player yet."
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
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
