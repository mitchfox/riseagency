import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ChevronLeft, Plus, Trash2 } from "lucide-react";

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
  defensive_transition: string[];
  defence: string[];
  offensive_transition: string[];
  offence: string[];
}

export const TacticalSchemes = ({ isAdmin }: { isAdmin: boolean }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedTeamScheme, setSelectedTeamScheme] = useState<string>('');
  const [selectedOppositionScheme, setSelectedOppositionScheme] = useState<string>('');
  const [schemeData, setSchemeData] = useState<SchemeData>({
    defensive_transition: [],
    defence: [],
    offensive_transition: [],
    offence: []
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing data when all three selections are made
  useEffect(() => {
    if (selectedPosition && selectedTeamScheme && selectedOppositionScheme) {
      loadSchemeData();
    } else {
      setSchemeData({
        defensive_transition: [],
        defence: [],
        offensive_transition: [],
        offence: []
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
        // Parse text data into bullet point arrays
        const parseText = (text: string | null): string[] => {
          if (!text) return [];
          return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[•\-*]\s*/, '')); // Remove bullet characters
        };

        setSchemeData({
          defensive_transition: parseText(data.defensive_transition),
          defence: parseText(data.defence),
          offensive_transition: parseText(data.offensive_transition),
          offence: parseText(data.offence)
        });
        setExistingId(data.id);
      } else {
        setSchemeData({
          defensive_transition: [],
          defence: [],
          offensive_transition: [],
          offence: []
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
      // Convert arrays back to bullet-pointed text
      const formatBulletPoints = (points: string[]): string => {
        return points.filter(p => p.trim()).map(p => `• ${p}`).join('\n');
      };

      const payload = {
        position: selectedPosition,
        team_scheme: selectedTeamScheme,
        opposition_scheme: selectedOppositionScheme,
        defensive_transition: formatBulletPoints(schemeData.defensive_transition),
        defence: formatBulletPoints(schemeData.defence),
        offensive_transition: formatBulletPoints(schemeData.offensive_transition),
        offence: formatBulletPoints(schemeData.offence)
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
      defensive_transition: [],
      defence: [],
      offensive_transition: [],
      offence: []
    });
    setExistingId(null);
  };

  const addBulletPoint = (field: keyof SchemeData) => {
    setSchemeData({
      ...schemeData,
      [field]: [...schemeData[field], '']
    });
  };

  const updateBulletPoint = (field: keyof SchemeData, index: number, value: string) => {
    const newPoints = [...schemeData[field]];
    newPoints[index] = value;
    setSchemeData({
      ...schemeData,
      [field]: newPoints
    });
  };

  const removeBulletPoint = (field: keyof SchemeData, index: number) => {
    setSchemeData({
      ...schemeData,
      [field]: schemeData[field].filter((_, i) => i !== index)
    });
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Defensive Transition</CardTitle>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBulletPoint('defensive_transition')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Point
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {schemeData.defensive_transition.length === 0 && (
                  <p className="text-sm text-muted-foreground">No points added yet</p>
                )}
                {schemeData.defensive_transition.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-muted-foreground mt-2">•</span>
                    <Input
                      value={point}
                      onChange={(e) => updateBulletPoint('defensive_transition', index, e.target.value)}
                      placeholder="Add point..."
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    {isAdmin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBulletPoint('defensive_transition', index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Defence</CardTitle>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBulletPoint('defence')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Point
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {schemeData.defence.length === 0 && (
                  <p className="text-sm text-muted-foreground">No points added yet</p>
                )}
                {schemeData.defence.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-muted-foreground mt-2">•</span>
                    <Input
                      value={point}
                      onChange={(e) => updateBulletPoint('defence', index, e.target.value)}
                      placeholder="Add point..."
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    {isAdmin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBulletPoint('defence', index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Offensive Transition</CardTitle>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBulletPoint('offensive_transition')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Point
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {schemeData.offensive_transition.length === 0 && (
                  <p className="text-sm text-muted-foreground">No points added yet</p>
                )}
                {schemeData.offensive_transition.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-muted-foreground mt-2">•</span>
                    <Input
                      value={point}
                      onChange={(e) => updateBulletPoint('offensive_transition', index, e.target.value)}
                      placeholder="Add point..."
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    {isAdmin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBulletPoint('offensive_transition', index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">In Possession</CardTitle>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBulletPoint('offence')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Point
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {schemeData.offence.length === 0 && (
                  <p className="text-sm text-muted-foreground">No points added yet</p>
                )}
                {schemeData.offence.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-muted-foreground mt-2">•</span>
                    <Input
                      value={point}
                      onChange={(e) => updateBulletPoint('offence', index, e.target.value)}
                      placeholder="Add point..."
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    {isAdmin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBulletPoint('offence', index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
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
