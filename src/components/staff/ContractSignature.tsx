import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Copy, Link, Eye, Settings, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SignatureContract {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  share_token: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
}

interface SignatureField {
  id: string;
  contract_id: string;
  field_type: 'text' | 'date' | 'signature';
  label: string;
  page_number: number;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  required: boolean;
  display_order: number;
}

interface SignatureSubmission {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string;
  field_values: Record<string, string>;
  signed_at: string;
}

interface ContractSignatureProps {
  isAdmin: boolean;
}

const ContractSignature = ({ isAdmin }: ContractSignatureProps) => {
  const [contracts, setContracts] = useState<SignatureContract[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<SignatureContract | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [submissions, setSubmissions] = useState<SignatureSubmission[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newField, setNewField] = useState({
    field_type: 'text' as 'text' | 'date' | 'signature',
    label: '',
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('signature_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contracts:', error);
      return;
    }

    setContracts(data as SignatureContract[]);
  };

  const fetchFields = async (contractId: string) => {
    const { data, error } = await supabase
      .from('signature_fields')
      .select('*')
      .eq('contract_id', contractId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching fields:', error);
      return;
    }

    setFields(data as SignatureField[]);
  };

  const fetchSubmissions = async (contractId: string) => {
    const { data, error } = await supabase
      .from('signature_submissions')
      .select('*')
      .eq('contract_id', contractId)
      .order('signed_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return;
    }

    setSubmissions(data as SignatureSubmission[]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or DOC/DOCX file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signature-contracts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('signature-contracts')
        .getPublicUrl(filePath);

      // Create contract record
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('signature_contracts')
        .insert([{
          title: formData.title,
          description: formData.description || null,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          created_by: user?.id,
        }]);

      if (insertError) throw insertError;

      toast.success('Contract created successfully');
      setShowCreateDialog(false);
      setFormData({ title: '', description: '' });
      setSelectedFile(null);
      fetchContracts();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast.error(error.message || 'Failed to create contract');
    } finally {
      setUploading(false);
    }
  };

  const handleAddField = async () => {
    if (!selectedContract || !newField.label) {
      toast.error('Please enter a field label');
      return;
    }

    const { error } = await supabase
      .from('signature_fields')
      .insert([{
        contract_id: selectedContract.id,
        field_type: newField.field_type,
        label: newField.label,
        page_number: 1,
        x_position: 0,
        y_position: 0,
        width: 200,
        height: newField.field_type === 'signature' ? 80 : 40,
        display_order: fields.length,
      }]);

    if (error) {
      toast.error('Failed to add field');
      console.error(error);
      return;
    }

    toast.success('Field added');
    setNewField({ field_type: 'text', label: '' });
    fetchFields(selectedContract.id);
  };

  const handleDeleteField = async (fieldId: string) => {
    const { error } = await supabase
      .from('signature_fields')
      .delete()
      .eq('id', fieldId);

    if (error) {
      toast.error('Failed to delete field');
      return;
    }

    toast.success('Field deleted');
    if (selectedContract) {
      fetchFields(selectedContract.id);
    }
  };

  const handleStatusChange = async (contractId: string, status: string) => {
    const { error } = await supabase
      .from('signature_contracts')
      .update({ status })
      .eq('id', contractId);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success('Status updated');
    fetchContracts();
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    const { error } = await supabase
      .from('signature_contracts')
      .delete()
      .eq('id', contractId);

    if (error) {
      toast.error('Failed to delete contract');
      return;
    }

    toast.success('Contract deleted');
    fetchContracts();
  };

  const copyShareLink = (shareToken: string) => {
    const link = `${window.location.origin}/sign/${shareToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const openFieldsDialog = (contract: SignatureContract) => {
    setSelectedContract(contract);
    fetchFields(contract.id);
    setShowFieldsDialog(true);
  };

  const openSubmissionsDialog = (contract: SignatureContract) => {
    setSelectedContract(contract);
    fetchSubmissions(contract.id);
    setShowSubmissionsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contract Signature</h3>
        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No signature contracts created yet
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold">{contract.title}</h4>
                    <Badge variant={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                  </div>
                  {contract.description && (
                    <p className="text-sm text-muted-foreground mt-1">{contract.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    File: {contract.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(contract.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyShareLink(contract.share_token)}
                    disabled={contract.status !== 'active'}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openFieldsDialog(contract)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Fields
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSubmissionsDialog(contract)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Submissions
                  </Button>
                  {isAdmin && (
                    <>
                      <Select
                        value={contract.status}
                        onValueChange={(value) => handleStatusChange(contract.id, value)}
                      >
                        <SelectTrigger className="w-[120px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteContract(contract.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Contract Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Signature Contract</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateContract} className="space-y-4">
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
              <Label htmlFor="file">Document (PDF or DOC) *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">{selectedFile.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fields Setup Dialog */}
      <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup Fields - {selectedContract?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Add fields that recipients need to fill in when signing this contract.
              </p>
              
              <div className="flex gap-2">
                <Select
                  value={newField.field_type}
                  onValueChange={(value: 'text' | 'date' | 'signature') => 
                    setNewField({ ...newField, field_type: value })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="signature">Signature</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Field label (e.g., Full Name)"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={handleAddField} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No fields added yet
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <Badge variant="outline">{field.field_type}</Badge>
                      <span className="font-medium">{field.label}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {fields.length > 0 && selectedContract?.status === 'draft' && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusChange(selectedContract.id, 'active')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate Contract
              </Button>
            )}

            {selectedContract?.status === 'active' && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium mb-2">Share Link:</p>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/sign/${selectedContract.share_token}`}
                    readOnly
                    className="text-xs"
                  />
                  <Button size="sm" onClick={() => copyShareLink(selectedContract.share_token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions - {selectedContract?.title}</DialogTitle>
          </DialogHeader>
          
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No submissions yet
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{submission.signer_name}</p>
                      <p className="text-sm text-muted-foreground">{submission.signer_email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(submission.signed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {Object.entries(submission.field_values).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        {value.startsWith('data:image') ? (
                          <img src={value} alt="Signature" className="h-12 border rounded" />
                        ) : (
                          <span>{value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractSignature;
