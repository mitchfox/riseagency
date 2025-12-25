import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, BookOpen, FileText, GraduationCap, ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TrainingMaterial {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  file_url: string | null;
  external_link: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface AgentTrainingMaterialsProps {
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: 'exam-info', label: 'Exam Information', icon: GraduationCap },
  { value: 'study-materials', label: 'Study Materials', icon: BookOpen },
  { value: 'exam-prep', label: 'Exam Preparation', icon: ClipboardList },
  { value: 'templates', label: 'Templates & Forms', icon: FileText },
];

const AgentTrainingMaterials = ({ isAdmin }: AgentTrainingMaterialsProps) => {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'exam-info',
    content: '',
    file_url: '',
    external_link: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_training_materials')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch training materials');
      console.error(error);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Only admins can modify training materials');
      return;
    }

    const materialData = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      content: formData.content || null,
      file_url: formData.file_url || null,
      external_link: formData.external_link || null,
    };

    if (editingMaterial) {
      const { error } = await supabase
        .from('agent_training_materials')
        .update(materialData)
        .eq('id', editingMaterial.id);

      if (error) {
        toast.error('Failed to update material');
        console.error(error);
        return;
      }
      toast.success('Material updated successfully');
    } else {
      const { error } = await supabase
        .from('agent_training_materials')
        .insert([{ ...materialData, display_order: materials.length }]);

      if (error) {
        toast.error('Failed to create material');
        console.error(error);
        return;
      }
      toast.success('Material created successfully');
    }

    setShowDialog(false);
    resetForm();
    fetchMaterials();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete materials');
      return;
    }

    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    const { error } = await supabase
      .from('agent_training_materials')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete material');
      console.error(error);
      return;
    }

    toast.success('Material deleted successfully');
    fetchMaterials();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'exam-info',
      content: '',
      file_url: '',
      external_link: '',
    });
    setEditingMaterial(null);
  };

  const openEditDialog = (material: TrainingMaterial) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      category: material.category,
      content: material.content || '',
      file_url: material.file_url || '',
      external_link: material.external_link || '',
    });
    setShowDialog(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    const IconComponent = cat?.icon || BookOpen;
    return <IconComponent className="h-5 w-5" />;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const groupedMaterials = CATEGORIES.map(cat => ({
    ...cat,
    materials: materials.filter(m => m.category === cat.value)
  }));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading training materials...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Agent Training & Exam Resources</h3>
          <p className="text-sm text-muted-foreground">FIFA Football Agent Exam preparation materials</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No training materials available yet
        </div>
      ) : (
        <div className="space-y-6">
          {groupedMaterials.map((group) => (
            group.materials.length > 0 && (
              <div key={group.value} className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <group.icon className="h-4 w-4" />
                  <h4 className="font-medium text-sm uppercase tracking-wide">{group.label}</h4>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{group.materials.length}</span>
                </div>
                <div className="grid gap-3">
                  {group.materials.map((material) => (
                    <Card key={material.id} className="hover:bg-accent/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-primary/10 rounded">
                              {getCategoryIcon(material.category)}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">{material.title}</CardTitle>
                              {material.description && (
                                <CardDescription className="mt-1">{material.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {material.external_link && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(material.external_link!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(material)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(material.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {material.content && (
                        <CardContent>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2 p-0 h-auto text-primary"
                            onClick={() => setExpandedId(expandedId === material.id ? null : material.id)}
                          >
                            {expandedId === material.id ? 'Hide content' : 'Show content'}
                          </Button>
                          {expandedId === material.id && (
                            <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap font-mono">
                              {material.content}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Edit' : 'Add'} Training Material
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                placeholder="Enter study notes, questions, or content..."
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="external_link">External Link (optional)</Label>
              <Input
                id="external_link"
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="file_url">File URL (optional)</Label>
              <Input
                id="file_url"
                type="url"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingMaterial ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentTrainingMaterials;
