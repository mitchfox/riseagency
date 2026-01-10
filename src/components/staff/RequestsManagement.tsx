import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Clock, MapPin, User, Target } from "lucide-react";
import { Link } from "react-router-dom";

interface PlayerRequest {
  id: string;
  position: string;
  age_range: string | null;
  league: string;
  playstyle: string | null;
  status: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const RequestsManagement = () => {
  const [requests, setRequests] = useState<PlayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PlayerRequest | null>(null);
  const [formData, setFormData] = useState({
    position: '',
    age_range: '',
    league: '',
    playstyle: '',
    status: 'active',
    is_visible: true,
  });

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('player_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } else {
      setRequests((data || []) as PlayerRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.position || !formData.league) {
      toast.error('Position and League are required');
      return;
    }

    if (editingRequest) {
      const { error } = await supabase
        .from('player_requests')
        .update({
          position: formData.position,
          age_range: formData.age_range || null,
          league: formData.league,
          playstyle: formData.playstyle || null,
          status: formData.status,
          is_visible: formData.is_visible,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', editingRequest.id);

      if (error) {
        toast.error('Failed to update request');
      } else {
        toast.success('Request updated');
        fetchRequests();
      }
    } else {
      const { error } = await supabase
        .from('player_requests')
        .insert({
          position: formData.position,
          age_range: formData.age_range || null,
          league: formData.league,
          playstyle: formData.playstyle || null,
          status: formData.status,
          is_visible: formData.is_visible,
        } as any);

      if (error) {
        toast.error('Failed to create request');
      } else {
        toast.success('Request created');
        fetchRequests();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    const { error } = await supabase
      .from('player_requests')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete request');
    } else {
      toast.success('Request deleted');
      fetchRequests();
    }
  };

  const toggleVisibility = async (request: PlayerRequest) => {
    const { error } = await supabase
      .from('player_requests')
      .update({ is_visible: !request.is_visible } as any)
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to update visibility');
    } else {
      fetchRequests();
    }
  };

  const resetForm = () => {
    setEditingRequest(null);
    setFormData({
      position: '',
      age_range: '',
      league: '',
      playstyle: '',
      status: 'active',
      is_visible: true,
    });
  };

  const openEditDialog = (request: PlayerRequest) => {
    setEditingRequest(request);
    setFormData({
      position: request.position,
      age_range: request.age_range || '',
      league: request.league,
      playstyle: request.playstyle || '',
      status: request.status,
      is_visible: request.is_visible,
    });
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas uppercase tracking-wider">Player Requests</h2>
          <p className="text-sm text-muted-foreground">Manage player search criteria displayed on the Agent Requests page</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/agent-requests" target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Public Page
            </Link>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="font-bebas uppercase tracking-wider">
                <Plus className="w-4 h-4 mr-2" />
                Add Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-bebas text-xl uppercase tracking-wider">
                  {editingRequest ? 'Edit Request' : 'New Player Request'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g. Central Midfielder"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age_range">Age Range</Label>
                    <Input
                      id="age_range"
                      value={formData.age_range}
                      onChange={(e) => setFormData(prev => ({ ...prev, age_range: e.target.value }))}
                      placeholder="e.g. 22-26"
                    />
                  </div>
                  <div>
                    <Label htmlFor="league">League *</Label>
                    <Input
                      id="league"
                      value={formData.league}
                      onChange={(e) => setFormData(prev => ({ ...prev, league: e.target.value }))}
                      placeholder="e.g. Championship"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="playstyle">Playstyle / Requirements</Label>
                  <Textarea
                    id="playstyle"
                    value={formData.playstyle}
                    onChange={(e) => setFormData(prev => ({ ...prev, playstyle: e.target.value }))}
                    placeholder="e.g. Box-to-box, high work rate"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="filled">Filled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_visible"
                      checked={formData.is_visible}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_visible: e.target.checked }))}
                      className="rounded border-border"
                    />
                    <Label htmlFor="is_visible">Visible on public page</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full font-bebas uppercase tracking-wider">
                  {editingRequest ? 'Update Request' : 'Create Request'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No player requests yet. Add your first one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {requests.map((request) => (
            <Card key={request.id} className={`${!request.is_visible ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={request.status === 'active' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                      {!request.is_visible && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bebas uppercase tracking-wider">
                      {request.position}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(request.created_at)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {request.age_range && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 text-primary" />
                      <span>Age: {request.age_range}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{request.league}</span>
                  </div>
                </div>
                {request.playstyle && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{request.playstyle}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(request)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisibility(request)}
                  >
                    {request.is_visible ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(request.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
