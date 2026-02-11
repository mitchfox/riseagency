import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Scale, Search, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgeRule {
  id: string;
  country: string;
  country_code: string;
  min_contact_age: number | null;
  min_sign_age: number | null;
  notes: string | null;
}

// Map country codes to flagcdn-compatible lowercase codes
const FLAG_CODE_MAP: Record<string, string> = {
  'GB-ENG': 'gb-eng',
  'GB-SCT': 'gb-sct',
  'GB-WLS': 'gb-wls',
  'GB-NIR': 'gb-nir',
  'XK': 'xk',
};

const getFlagUrl = (code: string): string => {
  const mapped = FLAG_CODE_MAP[code] || code.toLowerCase();
  return `https://flagcdn.com/w40/${mapped}.png`;
};

export const RecruitmentRulesTab = ({ isAdmin }: { isAdmin: boolean }) => {
  const [rules, setRules] = useState<AgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'min_contact_age' | 'min_sign_age' | 'notes' } | null>(null);
  const [editValue, setEditValue] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from("recruitment_age_rules")
      .select("*")
      .order("country");

    if (!error) setRules((data || []) as AgeRule[]);
    setLoading(false);
  };

  const handleCellClick = (rule: AgeRule, field: 'min_contact_age' | 'min_sign_age' | 'notes') => {
    if (!isAdmin) return;
    setEditingCell({ id: rule.id, field });
    const val = rule[field];
    setEditValue(val !== null && val !== undefined ? String(val) : "");
  };

  const handleSave = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    let value: number | string | null;
    if (field === 'notes') {
      value = editValue.trim() || null;
    } else {
      value = editValue.trim() ? parseFloat(editValue) : null;
      if (value !== null && isNaN(value)) {
        toast.error("Please enter a valid number");
        return;
      }
    }

    const { error } = await supabase
      .from("recruitment_age_rules")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save");
    } else {
      setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
      toast.success("Saved");
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const filtered = rules.filter(r =>
    r.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFlag = (code: string) => getFlagUrl(code);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => window.open('https://inside.fifa.com/transfer-system/agents/national-football-agent-regulations', '_blank')}
      >
        <ExternalLink className="w-3.5 h-3.5 mr-2" />
        National Football Agent Regulations (FIFA)
      </Button>

      <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
          Age Limit Rules by Country
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Minimum ages for contacting and signing players in each European country. {isAdmin ? "Tap a cell to edit." : ""}
        </p>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px] sm:min-w-[180px]">Country</TableHead>
                <TableHead className="text-center min-w-[90px] sm:min-w-[120px]">
                  <span className="hidden sm:inline">Min Contact Age</span>
                  <span className="sm:hidden">Contact</span>
                </TableHead>
                <TableHead className="text-center min-w-[90px] sm:min-w-[120px]">
                  <span className="hidden sm:inline">Min Sign Age</span>
                  <span className="sm:hidden">Sign</span>
                </TableHead>
                {!isMobile && <TableHead className="min-w-[160px]">Notes</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <img src={getFlag(rule.country_code)} alt={rule.country} className="w-5 h-auto rounded-sm" />
                      {rule.country}
                    </span>
                  </TableCell>

                  {/* Min Contact Age */}
                  <TableCell className="text-center">
                    {editingCell?.id === rule.id && editingCell.field === 'min_contact_age' ? (
                      <Input
                        type="number"
                        step="0.5"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-16 mx-auto text-center h-8 text-xs"
                        autoFocus
                        min={1}
                        max={99}
                      />
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs sm:text-sm ${isAdmin ? 'cursor-pointer hover:bg-muted' : ''}`}
                        onClick={() => handleCellClick(rule, 'min_contact_age')}
                      >
                        {rule.min_contact_age !== null ? (
                          <Badge variant="outline" className="text-xs">{rule.min_contact_age}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    )}
                  </TableCell>

                  {/* Min Sign Age */}
                  <TableCell className="text-center">
                    {editingCell?.id === rule.id && editingCell.field === 'min_sign_age' ? (
                      <Input
                        type="number"
                        step="0.5"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-16 mx-auto text-center h-8 text-xs"
                        autoFocus
                        min={1}
                        max={99}
                      />
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs sm:text-sm ${isAdmin ? 'cursor-pointer hover:bg-muted' : ''}`}
                        onClick={() => handleCellClick(rule, 'min_sign_age')}
                      >
                        {rule.min_sign_age !== null ? (
                          <Badge variant="outline" className="text-xs">{rule.min_sign_age}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    )}
                  </TableCell>

                  {/* Notes (desktop only) */}
                  {!isMobile && (
                    <TableCell>
                      {editingCell?.id === rule.id && editingCell.field === 'notes' ? (
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSave}
                          onKeyDown={handleKeyDown}
                          className="h-8 text-xs"
                          autoFocus
                          placeholder="Add note..."
                        />
                      ) : (
                        <span
                          className={`text-xs text-muted-foreground ${isAdmin ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''}`}
                          onClick={() => handleCellClick(rule, 'notes')}
                        >
                          {rule.notes || (isAdmin ? 'Add note...' : '—')}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 4} className="text-center text-sm text-muted-foreground py-8">
                    No countries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
