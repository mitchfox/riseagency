import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ChevronLeft } from "lucide-react";

const POSITIONS = [
  'Goalkeeper',
  'Full-Back',
  'Centre-Back',
  'Central Defensive-Midfielder',
  'Central Midfielder',
  'Attacking Midfielder',
  'Winger',
  'Centre-Forward'
];

const TEAM_SCHEMES = [
  '4-3-3',
  '4-2-1-3',
  '4-2-4',
  '4-2-2',
  '4-3-1-2',
  '3-4-3',
  '3-3-1-3',
  '3-3-4',
  '3-3-2-2',
  '3-4-1-2'
];

interface SchemeData {
  defensive_transition: string;
  defence: string;
  offensive_transition: string;
  offence: string;
}

export const TacticalSchemes = ({ isAdmin }: { isAdmin: boolean }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedTeamScheme, setSelectedTeamScheme] = useState<string>('');
  const [selectedOppositionScheme, setSelectedOppositionScheme] = useState<string>('');
  const [schemeData, setSchemeData] = useState<SchemeData>({
    defensive_transition: '',
    defence: '',
    offensive_transition: '',
    offence: ''
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing data when all three selections are made
  useEffect(() => {
    if (selectedPosition && selectedTeamScheme && selectedOppositionScheme) {
      loadSchemeData();
    } else {
      setSchemeData({
        defensive_transition: '',
        defence: '',
        offensive_transition: '',
        offence: ''
      });
      setExistingId(null);
    }
  }, [selectedPosition, selectedTeamScheme, selectedOppositionScheme]);

  const loadSchemeData = async () => {
    try {
      const { data, error } = await supabase
        .from('tactical_schemes')
        .select('*')
        .eq('position', selectedPosition)
        .eq('team_scheme', selectedTeamScheme)
        .eq('opposition_scheme', selectedOppositionScheme)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSchemeData({
          defensive_transition: data.defensive_transition || '',
          defence: data.defence || '',
          offensive_transition: data.offensive_transition || '',
          offence: data.offence || ''
        });
        setExistingId(data.id);
      } else {
        setSchemeData({
          defensive_transition: '',
          defence: '',
          offensive_transition: '',
          offence: ''
        });
        setExistingId(null);
      }
    } catch (error) {
      console.error('Error loading scheme data:', error);
      toast.error('Failed to load scheme data');
    }
  };

  const handleSave = async () => {
    if (!selectedPosition || !selectedTeamScheme || !selectedOppositionScheme) {
      toast.error('Please select position, team scheme, and opposition scheme');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        position: selectedPosition,
        team_scheme: selectedTeamScheme,
        opposition_scheme: selectedOppositionScheme,
        defensive_transition: schemeData.defensive_transition,
        defence: schemeData.defence,
        offensive_transition: schemeData.offensive_transition,
        offence: schemeData.offence
      };

      if (existingId) {
        const { error } = await supabase
          .from('tactical_schemes')
          .update(payload)
          .eq('id', existingId);

        if (error) throw error;
        toast.success('Scheme updated successfully');
      } else {
        const { data, error } = await supabase
          .from('tactical_schemes')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setExistingId(data.id);
        toast.success('Scheme created successfully');
      }
    } catch (error) {
      console.error('Error saving scheme:', error);
      toast.error('Failed to save scheme');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedPosition('');
    setSelectedTeamScheme('');
    setSelectedOppositionScheme('');
    setSchemeData({
      defensive_transition: '',
      defence: '',
      offensive_transition: '',
      offence: ''
    });
    setExistingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Position</Label>
          <Select value={selectedPosition} onValueChange={setSelectedPosition}>
            <SelectTrigger>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map(position => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPosition && (
          <div className="space-y-2">
            <Label>Team Scheme</Label>
            <Select value={selectedTeamScheme} onValueChange={setSelectedTeamScheme}>
              <SelectTrigger>
                <SelectValue placeholder="Select team scheme" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SCHEMES.map(scheme => (
                  <SelectItem key={scheme} value={scheme}>
                    {scheme}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedPosition && selectedTeamScheme && (
          <div className="space-y-2">
            <Label>Opposition Scheme</Label>
            <Select value={selectedOppositionScheme} onValueChange={setSelectedOppositionScheme}>
              <SelectTrigger>
                <SelectValue placeholder="Select opposition scheme" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SCHEMES.map(scheme => (
                  <SelectItem key={scheme} value={scheme}>
                    {scheme}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedPosition && selectedTeamScheme && selectedOppositionScheme && (
        <>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Change Selection
            </Button>
            {isAdmin && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : existingId ? 'Update' : 'Save'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Defensive Transition</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemeData.defensive_transition}
                  onChange={(e) => setSchemeData({ ...schemeData, defensive_transition: e.target.value })}
                  placeholder="Add notes about defensive transition..."
                  className="min-h-[200px]"
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Defence</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemeData.defence}
                  onChange={(e) => setSchemeData({ ...schemeData, defence: e.target.value })}
                  placeholder="Add notes about defence..."
                  className="min-h-[200px]"
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offensive Transition</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemeData.offensive_transition}
                  onChange={(e) => setSchemeData({ ...schemeData, offensive_transition: e.target.value })}
                  placeholder="Add notes about offensive transition..."
                  className="min-h-[200px]"
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offence</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemeData.offence}
                  onChange={(e) => setSchemeData({ ...schemeData, offence: e.target.value })}
                  placeholder="Add notes about offence..."
                  className="min-h-[200px]"
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!selectedPosition && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Select a position to begin</p>
        </Card>
      )}
    </div>
  );
};
