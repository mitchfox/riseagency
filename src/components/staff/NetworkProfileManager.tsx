import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search, Globe, Building2, UserCheck } from "lucide-react";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface NetworkProfileManagerProps {
  type: 'country' | 'club' | 'role';
}

interface ProfileItem {
  id: string;
  [key: string]: any;
}

export const NetworkProfileManager = ({ type }: NetworkProfileManagerProps) => {
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfileItem | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const tableName = type === 'country' ? 'network_country_profiles'
    : type === 'club' ? 'network_club_profiles'
    : 'network_role_profiles';

  const nameField = type === 'country' ? 'country_name'
    : type === 'club' ? 'club_name'
    : 'role_name';

  const label = type === 'country' ? 'Country' : type === 'club' ? 'Club' : 'Role';

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(nameField);

    if (error) {
      toast.error(`Failed to fetch ${label.toLowerCase()} profiles`);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(item).some(v =>
      typeof v === 'string' && v.toLowerCase().includes(q)
    );
  });

  const getFields = () => {
    if (type === 'country') {
      return [
        { key: 'country_name', label: 'Country Name', type: 'input', required: true },
        { key: 'playing_style', label: 'Playing Style', type: 'textarea' },
        { key: 'common_formations', label: 'Common Formations', type: 'input' },
        { key: 'key_characteristics', label: 'Key Characteristics', type: 'textarea' },
        { key: 'league_structure', label: 'League Structure', type: 'textarea' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ];
    }
    if (type === 'club') {
      return [
        { key: 'club_name', label: 'Club Name', type: 'input', required: true },
        { key: 'country', label: 'Country', type: 'input' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'playing_style', label: 'Playing Style', type: 'textarea' },
        { key: 'league', label: 'League', type: 'input' },
        { key: 'tier', label: 'Tier', type: 'input' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ];
    }
    return [
      { key: 'role_name', label: 'Role Name', type: 'input', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'typical_responsibilities', label: 'Typical Responsibilities', type: 'textarea' },
      { key: 'seniority_level', label: 'Seniority Level', type: 'input' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ];
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const initial: Record<string, string> = {};
    getFields().forEach(f => { initial[f.key] = ''; });
    setFormData(initial);
    setShowDialog(true);
  };

  const handleOpenEdit = (item: ProfileItem) => {
    setEditingItem(item);
    const initial: Record<string, string> = {};
    getFields().forEach(f => { initial[f.key] = item[f.key] || ''; });
    setFormData(initial);
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data: Record<string, any> = {};
    getFields().forEach(f => { data[f.key] = formData[f.key]?.trim() || null; });

    if (!data[nameField]) {
      toast.error(`${label} name is required`);
      return;
    }

    if (editingItem) {
      const { error } = await supabase
        .from(tableName)
        .update(data as any)
        .eq('id', editingItem.id);

      if (error) {
        toast.error('Failed to update');
        return;
      }
      toast.success('Updated');
    } else {
      const { error } = await supabase
        .from(tableName)
        .insert([data] as any);

      if (error) {
        if (error.code === '23505') {
          toast.error(`A profile for this ${label.toLowerCase()} already exists`);
        } else {
          toast.error('Failed to create');
        }
        return;
      }
      toast.success('Created');
    }

    setShowDialog(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${label.toLowerCase()} profile?`)) return;
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('Deleted');
    fetchItems();
  };

  const Icon = type === 'country' ? Globe : type === 'club' ? Building2 : UserCheck;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${label.toLowerCase()} profiles...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button size="sm" onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add {label}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No {label.toLowerCase()} profiles yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {type === 'country' && (
                      <img src={getCountryFlagUrl(item.country_name)} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                    )}
                    <h4 className="font-semibold text-sm truncate">{item[nameField]}</h4>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleOpenEdit(item)} className="p-1 rounded hover:bg-muted" title="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {type === 'country' && item.playing_style && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.playing_style}</p>
                )}
                {type === 'country' && item.key_characteristics && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.key_characteristics}</p>
                )}
                {type === 'club' && item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {type === 'club' && item.league && (
                  <p className="text-xs text-muted-foreground mt-1">{item.league}{item.tier ? ` · ${item.tier}` : ''}</p>
                )}
                {type === 'role' && item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {type === 'role' && item.seniority_level && (
                  <p className="text-xs text-muted-foreground mt-1">Level: {item.seniority_level}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${label} Profile` : `Add ${label} Profile`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getFields().map(field => (
              <div key={field.key}>
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
