import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Table, Folder, HardDrive, ExternalLink, Plus, ArrowLeft, Trash2, Edit, Link as LinkIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MarkdownContent } from "@/utils/markdownRenderer";

interface CustomResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: 'link' | 'text' | 'table' | 'folder';
  url: string | null;
  content: string | null;
  table_data: any;
  icon: string;
  color: string;
  folder_id: string | null;
  display_order: number;
  created_at: string;
}

// Default resources that are always shown at root level
const defaultResources = [
  {
    id: 'default-post-templates',
    title: "Post Templates",
    description: "Content templates and planning",
    icon: "FileText",
    url: "https://flaxen-voice-e64.notion.site/1c248d32b9a181c9aab5c06bace0237b?v=1c248d32b9a18158b8fc000c0a4166b0",
    color: "text-blue-500",
    resource_type: 'link' as const,
    isDefault: true,
  },
  {
    id: 'default-canva-design',
    title: "Canva Design",
    description: "Design templates and assets",
    icon: "Image",
    url: "https://www.canva.com/design/DAG0N9vOwtg/6ZmTuSDkJzR9_b0nl7czJA/edit?utm_content=DAG0N9vOwtg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    color: "text-purple-500",
    resource_type: 'link' as const,
    isDefault: true,
  },
  {
    id: 'default-player-images',
    title: "Player Images",
    description: "Player photo templates",
    icon: "Image",
    url: "https://www.canva.com/design/DAG0Fs-P2oY/xnS87xfydD4uus5vACSKgA/edit",
    color: "text-green-500",
    resource_type: 'link' as const,
    isDefault: true,
  },
  {
    id: 'default-topic-schedule',
    title: "Topic Schedule",
    description: "Content calendar and planning",
    icon: "Table",
    url: "https://docs.google.com/spreadsheets/d/1UtMiSeVkxDCP0b6DJmuB72dKHTUHAfyInUB_Ts2iRcc/edit?usp=sharing",
    color: "text-orange-500",
    resource_type: 'link' as const,
    isDefault: true,
  },
  {
    id: 'default-canva-folder',
    title: "Canva Folder",
    description: "Templates and published posts",
    icon: "Folder",
    url: "https://www.canva.com/folder/FAFRi-Qvnf4",
    color: "text-pink-500",
    resource_type: 'link' as const,
    isDefault: true,
  },
  {
    id: 'default-google-drive',
    title: "Google Drive",
    description: "Shared marketing resources",
    icon: "HardDrive",
    url: "https://drive.google.com/drive/folders/1fCfrG6bY8YuEjm7bVMaxIGEoXOyCBLMj?usp=sharing",
    color: "text-indigo-500",
    resource_type: 'link' as const,
    isDefault: true,
  }
];

const COLOR_OPTIONS = [
  { value: 'text-blue-500', label: 'Blue' },
  { value: 'text-green-500', label: 'Green' },
  { value: 'text-purple-500', label: 'Purple' },
  { value: 'text-orange-500', label: 'Orange' },
  { value: 'text-pink-500', label: 'Pink' },
  { value: 'text-cyan-500', label: 'Cyan' },
  { value: 'text-yellow-500', label: 'Yellow' },
  { value: 'text-red-500', label: 'Red' },
  { value: 'text-indigo-500', label: 'Indigo' },
];

interface MarketingResourcesProps {
  canManage?: boolean;
}

export const MarketingResources = ({ canManage = false }: MarketingResourcesProps) => {
  const [resources, setResources] = useState<CustomResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'folder' | 'resource'>('resource');
  const [saving, setSaving] = useState(false);
  const [editingResource, setEditingResource] = useState<CustomResource | null>(null);
  const [viewingResource, setViewingResource] = useState<CustomResource | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    resource_type: 'link' as 'link' | 'text' | 'table',
    url: '',
    content: '',
    table_data: '',
    color: 'text-blue-500',
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_marketing_resources')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setResources((data || []) as CustomResource[]);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      
      let tableData = null;
      if (form.resource_type === 'table' && form.table_data) {
        try {
          tableData = JSON.parse(form.table_data);
        } catch {
          const rows = form.table_data.split('\n').map(row => row.split('|').map(cell => cell.trim()));
          tableData = { headers: rows[0], rows: rows.slice(1) };
        }
      }

      const resourceData = {
        title: form.title,
        description: form.description || null,
        resource_type: dialogMode === 'folder' ? 'folder' : form.resource_type,
        url: form.resource_type === 'link' ? form.url : null,
        content: form.resource_type === 'text' ? form.content : null,
        table_data: tableData,
        icon: dialogMode === 'folder' ? 'Folder' : (form.resource_type === 'link' ? 'Link' : form.resource_type === 'table' ? 'Table' : 'FileText'),
        color: form.color,
        folder_id: dialogMode === 'folder' ? null : currentFolderId,
        created_by: staffUserId,
      };

      if (editingResource) {
        const { error } = await supabase
          .from('custom_marketing_resources')
          .update(resourceData)
          .eq('id', editingResource.id);
        if (error) throw error;
        toast.success('Resource updated');
      } else {
        const { error } = await supabase
          .from('custom_marketing_resources')
          .insert(resourceData);
        if (error) throw error;
        toast.success(dialogMode === 'folder' ? 'Folder created' : 'Resource created');
      }

      setShowDialog(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('Delete this item?')) return;

    try {
      const { error } = await supabase
        .from('custom_marketing_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Deleted');
      fetchResources();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (resource: CustomResource) => {
    setEditingResource(resource);
    setDialogMode(resource.resource_type === 'folder' ? 'folder' : 'resource');
    setForm({
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type === 'folder' ? 'link' : resource.resource_type as any,
      url: resource.url || '',
      content: resource.content || '',
      table_data: resource.table_data ? JSON.stringify(resource.table_data, null, 2) : '',
      color: resource.color,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingResource(null);
    setDialogMode('resource');
    setForm({
      title: '',
      description: '',
      resource_type: 'link',
      url: '',
      content: '',
      table_data: '',
      color: 'text-blue-500',
    });
  };

  const openAddFolder = () => {
    resetForm();
    setDialogMode('folder');
    setShowDialog(true);
  };

  const openAddResource = () => {
    resetForm();
    setDialogMode('resource');
    setShowDialog(true);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Link': return LinkIcon;
      case 'Table': return Table;
      case 'Folder': return Folder;
      case 'Image': return Image;
      case 'HardDrive': return HardDrive;
      default: return FileText;
    }
  };

  const handleResourceClick = (resource: CustomResource | typeof defaultResources[0]) => {
    if (resource.resource_type === 'folder') {
      setCurrentFolderId(resource.id);
      setCurrentFolderName(resource.title);
    } else if (resource.resource_type === 'link' && resource.url) {
      window.open(resource.url, '_blank');
    } else if ('content' in resource || 'table_data' in resource) {
      setViewingResource(resource as CustomResource);
    }
  };

  const goBack = () => {
    setCurrentFolderId(null);
    setCurrentFolderName("");
  };

  // Get items for current view
  const folders = resources.filter(r => r.resource_type === 'folder');
  const currentItems = currentFolderId 
    ? resources.filter(r => r.folder_id === currentFolderId)
    : [...defaultResources, ...resources.filter(r => r.resource_type === 'folder' || !r.folder_id)];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentFolderId && (
                <Button variant="ghost" size="icon" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <CardTitle className="text-base">
                  {currentFolderId ? currentFolderName : "Marketing Resources"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {currentFolderId ? "Resources in this folder" : "Quick access to all marketing tools and templates"}
                </CardDescription>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                {!currentFolderId && (
                  <Button size="sm" variant="outline" onClick={openAddFolder}>
                    <Folder className="w-4 h-4 mr-1" />
                    Add Folder
                  </Button>
                )}
                <Button size="sm" onClick={openAddResource}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Resource
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentItems.map((item) => {
              const Icon = getIcon(item.icon);
              const isDefault = 'isDefault' in item && item.isDefault;
              const isFolder = item.resource_type === 'folder';
              
              return (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => handleResourceClick(item)}
                >
                  <Card className={`h-full transition-all hover:shadow-lg hover:border-primary/50 ${isFolder ? 'bg-muted/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg bg-muted ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </h3>
                            {item.resource_type === 'link' && !isFolder && (
                              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {!isDefault && !isFolder && 'resource_type' in item && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {item.resource_type}
                            </Badge>
                          )}
                        </div>
                        {canManage && !isDefault && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item as CustomResource)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          
          {currentItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No resources in this folder yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit' : 'Add'} {dialogMode === 'folder' ? 'Folder' : 'Resource'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'folder' 
                ? 'Create a folder to organize resources'
                : 'Add a link, text guide, or data table'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={dialogMode === 'folder' ? 'Folder name' : 'Resource title'}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <Label>Color</Label>
                <Select
                  value={form.color}
                  onValueChange={(v) => setForm({ ...form, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.value.replace('text-', 'bg-')}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dialogMode === 'resource' && (
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.resource_type}
                    onValueChange={(v) => setForm({ ...form, resource_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="text">Text/Guide</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dialogMode === 'resource' && form.resource_type === 'link' && (
                <div className="col-span-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://... (optional - add later)"
                  />
                </div>
              )}

              {dialogMode === 'resource' && form.resource_type === 'text' && (
                <div className="col-span-2">
                  <Label htmlFor="content">Content (Markdown supported)</Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write your guide or notes here..."
                    rows={10}
                  />
                </div>
              )}

              {dialogMode === 'resource' && form.resource_type === 'table' && (
                <div className="col-span-2">
                  <Label htmlFor="table_data">Table Data</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Use pipe-separated format: Header1 | Header2<br/>
                    Row1Col1 | Row1Col2
                  </p>
                  <Textarea
                    id="table_data"
                    value={form.table_data}
                    onChange={(e) => setForm({ ...form, table_data: e.target.value })}
                    placeholder="Series Name | Canva URL | Description&#10;Monday Motivation | https://canva.com/... | Weekly motivational quote"
                    rows={8}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingResource ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Resource Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={(open) => { if (!open) setViewingResource(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingResource?.title}</DialogTitle>
            {viewingResource?.description && (
              <DialogDescription>{viewingResource.description}</DialogDescription>
            )}
          </DialogHeader>
          
          {viewingResource?.resource_type === 'text' && viewingResource.content && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownContent content={viewingResource.content} />
            </div>
          )}

          {viewingResource?.resource_type === 'table' && viewingResource.table_data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    {(viewingResource.table_data.headers || []).map((header: string, i: number) => (
                      <th key={i} className="border p-2 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewingResource.table_data.rows || []).map((row: string[], i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      {row.map((cell, j) => (
                        <td key={j} className="border p-2">
                          {cell.startsWith('http') ? (
                            <a href={cell} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {cell.length > 40 ? cell.slice(0, 40) + '...' : cell}
                            </a>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
