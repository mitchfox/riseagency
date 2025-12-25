import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Building2, Users, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface BusinessDocument {
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

interface BusinessDocumentsProps {
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: 'company-info', label: 'Company Information', icon: Building2 },
  { value: 'operations', label: 'Operations & Standards', icon: Users },
  { value: 'planning', label: 'Planning & Strategy', icon: Calendar },
  { value: 'general', label: 'General Documents', icon: FileText },
];

const BusinessDocuments = ({ isAdmin }: BusinessDocumentsProps) => {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<BusinessDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    content: '',
    file_url: '',
    external_link: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_documents')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch business documents');
      console.error(error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Only admins can modify business documents');
      return;
    }

    const documentData = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      content: formData.content || null,
      file_url: formData.file_url || null,
      external_link: formData.external_link || null,
    };

    if (editingDocument) {
      const { error } = await supabase
        .from('business_documents')
        .update(documentData)
        .eq('id', editingDocument.id);

      if (error) {
        toast.error('Failed to update document');
        console.error(error);
        return;
      }
      toast.success('Document updated successfully');
    } else {
      const { error } = await supabase
        .from('business_documents')
        .insert([{ ...documentData, display_order: documents.length }]);

      if (error) {
        toast.error('Failed to create document');
        console.error(error);
        return;
      }
      toast.success('Document created successfully');
    }

    setShowDialog(false);
    resetForm();
    fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete documents');
      return;
    }

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    const { error } = await supabase
      .from('business_documents')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete document');
      console.error(error);
      return;
    }

    toast.success('Document deleted successfully');
    fetchDocuments();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      content: '',
      file_url: '',
      external_link: '',
    });
    setEditingDocument(null);
  };

  const openEditDialog = (document: BusinessDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      description: document.description || '',
      category: document.category,
      content: document.content || '',
      file_url: document.file_url || '',
      external_link: document.external_link || '',
    });
    setShowDialog(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    const IconComponent = cat?.icon || FileText;
    return <IconComponent className="h-5 w-5" />;
  };

  const groupedDocuments = CATEGORIES.map(cat => ({
    ...cat,
    documents: documents.filter(d => d.category === cat.value)
  })).filter(group => group.documents.length > 0);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading business documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Business Documents</h3>
          <p className="text-sm text-muted-foreground">Internal company documentation and resources</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No business documents available yet
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {groupedDocuments.map((group) => (
            <div key={group.value} className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <group.icon className="h-4 w-4" />
                <h4 className="font-medium text-sm uppercase tracking-wide">{group.label}</h4>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{group.documents.length}</span>
              </div>
              {group.documents.map((doc) => (
                <AccordionItem key={doc.id} value={doc.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 bg-primary/10 rounded">
                        {getCategoryIcon(doc.category)}
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-4 space-y-4">
                      {doc.content && (
                        <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                          {doc.content}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {doc.external_link && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.external_link!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Link
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(doc)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>
          ))}
        </Accordion>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Edit' : 'Add'} Business Document
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
                rows={12}
                placeholder="Enter document content..."
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
                {editingDocument ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDocuments;
