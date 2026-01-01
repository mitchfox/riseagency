import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Scale, Download, Wallet, GitCompare, GraduationCap, PenTool } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentsManagement from "./PaymentsManagement";
import ContractCrossReference from "./ContractCrossReference";
import AgentTrainingMaterials from "./AgentTrainingMaterials";
import ContractSignature from "./ContractSignature";
interface LegalDocument {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: 'contract' | 'regulation';
  file_url: string | null;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
}

interface LegalManagementProps {
  isAdmin: boolean;
}

const LegalManagement = ({ isAdmin }: LegalManagementProps) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'contract' as 'contract' | 'regulation',
    file_url: '',
    effective_date: '',
  });
  const [activeTab, setActiveTab] = useState<'contract' | 'regulation' | 'payments' | 'training' | 'signature'>('contract');
  const [showCrossReference, setShowCrossReference] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      toast.error('Failed to fetch legal documents');
      console.error(error);
      return;
    }

    setDocuments((data || []) as LegalDocument[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Only admins can modify legal documents');
      return;
    }

    const documentData = {
      title: formData.title,
      description: formData.description || null,
      content: formData.content || null,
      category: formData.category,
      file_url: formData.file_url || null,
      effective_date: formData.effective_date || null,
    };

    if (editingDocument) {
      const { error } = await supabase
        .from('legal_documents')
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
        .from('legal_documents')
        .insert([documentData]);

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
      toast.error('Only admins can delete legal documents');
      return;
    }

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    const { error } = await supabase
      .from('legal_documents')
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
      content: '',
      category: 'contract',
      file_url: '',
      effective_date: '',
    });
    setEditingDocument(null);
  };

  const openEditDialog = (document: LegalDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      description: document.description || '',
      content: document.content || '',
      category: document.category,
      file_url: document.file_url || '',
      effective_date: document.effective_date || '',
    });
    setShowDialog(true);
  };

  const openAddDialog = (category: 'contract' | 'regulation') => {
    resetForm();
    setFormData(prev => ({ ...prev, category }));
    setShowDialog(true);
  };

  const contracts = documents.filter(doc => doc.category === 'contract');
  const regulations = documents.filter(doc => doc.category === 'regulation');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contract" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Contracts</span>
            <span className="sm:hidden">Contracts</span>
          </TabsTrigger>
          <TabsTrigger value="regulation" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Scale className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Rules</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <PenTool className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Signature</span>
            <span className="sm:hidden">Sign</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Agent Training</span>
            <span className="sm:hidden">Training</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contract" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold">Contracts</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCrossReference(true)} 
                size="sm" 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <GitCompare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Cross-Reference</span>
                <span className="sm:hidden">Compare</span>
              </Button>
              {isAdmin && (
                <Button onClick={() => openAddDialog('contract')} size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Contract</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>

          {contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No contracts available
            </div>
          ) : (
            <div className="grid gap-4">
              {contracts.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base sm:text-lg">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                      )}
                      {doc.effective_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Effective: {new Date(doc.effective_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.file_url!, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {doc.content && (
                    <div className="mt-4 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                      {doc.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="regulation" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold">Rules & Regulations</h3>
            {isAdmin && (
              <Button onClick={() => openAddDialog('regulation')} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Regulation</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>

          {regulations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No regulations available
            </div>
          ) : (
            <div className="grid gap-4">
              {regulations.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base sm:text-lg">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                      )}
                      {doc.effective_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Effective: {new Date(doc.effective_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.file_url!, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {doc.content && (
                    <div className="mt-4 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                      {doc.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <AgentTrainingMaterials isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="signature" className="space-y-4">
          <ContractSignature isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsManagement isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Edit' : 'Add'} {formData.category === 'contract' ? 'Contract' : 'Regulation'}
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
                rows={8}
                placeholder="Enter the full text of the document here..."
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

            <div>
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
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

      <ContractCrossReference 
        open={showCrossReference} 
        onOpenChange={setShowCrossReference} 
      />
    </div>
  );
};

export default LegalManagement;
