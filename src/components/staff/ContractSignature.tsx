import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Eye, CheckCircle, Save, Loader2, PenTool, Download, Link, Upload, BookMarked, ChevronDown, Users, Copy, Lock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PDFDocumentViewer, FieldPosition } from "./PDFDocumentViewer";
import { downloadSignedContractPDF } from "@/lib/pdfExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SignatureContract {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  share_token: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  owner_signed_at: string | null;
  owner_field_values: Record<string, string> | null;
  completed_pdf_url: string | null;
  view_password: string | null;
  is_mandate?: boolean | null;
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
  signer_party: 'owner' | 'counterparty';
}

interface SignatureSubmission {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string;
  field_values: Record<string, string>;
  signed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  intent_consent_at?: string | null;
  document_hash?: string | null;
  signed_pdf_url?: string | null;
  signed_pdf_hash?: string | null;
}

interface SavedSignature {
  id: string;
  name: string;
  signature_data: string;
  is_default: boolean;
}

interface ContractSignatureProps {
  isAdmin: boolean;
}

const ContractSignature = ({ isAdmin }: ContractSignatureProps) => {
  const [contracts, setContracts] = useState<SignatureContract[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [showOwnerSignDialog, setShowOwnerSignDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<SignatureContract | null>(null);
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldPosition[]>([]);
  const [allContractFields, setAllContractFields] = useState<Record<string, FieldPosition[]>>({});
  const [submissions, setSubmissions] = useState<SignatureSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<SignatureSubmission[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Collapsible sections state
  const [activeOpen, setActiveOpen] = useState(true);
  const [draftOpen, setDraftOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    view_password: '',
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedContractForPassword, setSelectedContractForPassword] = useState<SignatureContract | null>(null);
  const [contractPassword, setContractPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Owner signing state
  const [ownerFieldValues, setOwnerFieldValues] = useState<Record<string, string>>({});
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Signature options state
  const [signatureTab, setSignatureTab] = useState<'draw' | 'upload' | 'saved'>('draw');
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [newSignatureName, setNewSignatureName] = useState('My Signature');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContracts();
    fetchSavedSignatures();
    fetchAllSubmissions();
    fetchAllContractFields();
  }, []);

  const fetchSavedSignatures = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('saved_signatures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedSignatures(data as SavedSignature[]);
    }
  };

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

  const fetchAllSubmissions = async () => {
    const { data, error } = await supabase
      .from('signature_submissions')
      .select('*')
      .order('signed_at', { ascending: false });

    if (!error && data) {
    setAllSubmissions(data as SignatureSubmission[]);
    }
  };

  const fetchAllContractFields = async () => {
    const { data, error } = await supabase
      .from('signature_fields')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching all fields:', error);
      return;
    }

    // Group fields by contract_id
    const fieldsByContract: Record<string, FieldPosition[]> = {};
    (data as SignatureField[]).forEach(f => {
      if (!fieldsByContract[f.contract_id]) {
        fieldsByContract[f.contract_id] = [];
      }
      fieldsByContract[f.contract_id].push({
        id: f.id,
        field_type: f.field_type,
        label: f.label,
        page_number: f.page_number,
        x_position: f.x_position,
        y_position: f.y_position,
        width: f.width,
        height: f.height,
        signer_party: f.signer_party || 'counterparty',
      });
    });
    setAllContractFields(fieldsByContract);
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

    // Convert DB fields to FieldPosition format
    const fieldPositions: FieldPosition[] = (data as SignatureField[]).map(f => ({
      id: f.id,
      field_type: f.field_type,
      label: f.label,
      page_number: f.page_number,
      x_position: f.x_position,
      y_position: f.y_position,
      width: f.width,
      height: f.height,
      signer_party: f.signer_party || 'counterparty',
    }));

    setFields(fieldPositions);
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
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file for proper document viewing');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signature-contracts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('signature-contracts')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('signature_contracts')
        .insert([{
          title: formData.title,
          description: formData.description || null,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          created_by: user?.id,
          view_password: formData.view_password ? btoa(formData.view_password) : null,
        }]);

      if (insertError) throw insertError;

      toast.success('Contract created successfully');
      setShowCreateDialog(false);
      setFormData({ title: '', description: '', view_password: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchContracts();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast.error(error.message || 'Failed to create contract');
    } finally {
      setUploading(false);
    }
  };

  const saveFields = async () => {
    if (!selectedContract) return;
    
    setSaving(true);
    try {
      // Delete existing fields
      await supabase
        .from('signature_fields')
        .delete()
        .eq('contract_id', selectedContract.id);

      // Insert new fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((f, index) => ({
          contract_id: selectedContract.id,
          field_type: f.field_type,
          label: f.label,
          page_number: f.page_number,
          x_position: f.x_position,
          y_position: f.y_position,
          width: f.width,
          height: f.height,
          required: true,
          display_order: index,
          signer_party: f.signer_party,
        }));

        const { error } = await supabase
          .from('signature_fields')
          .insert(fieldsToInsert);

        if (error) throw error;
      }

      toast.success('Fields saved successfully');
      setShowEditorDialog(false);
      fetchAllContractFields(); // Refresh all fields cache
    } catch (error: any) {
      console.error('Error saving fields:', error);
      toast.error('Failed to save fields');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (contractId: string, status: string) => {
    if (status === 'active') {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        await supabase.functions.invoke('lock-signature-contract', {
          body: { contract_id: contractId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (e) {
        console.error('Failed to lock contract:', e);
        toast.error('Failed to lock contract version. Status not changed.');
        return;
      }
    }
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

  const duplicateContract = async (contract: SignatureContract) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create a copy of the contract with new title
      const newTitle = `${contract.title} (Copy)`;
      
      const { data: newContract, error: contractError } = await supabase
        .from('signature_contracts')
        .insert([{
          title: newTitle,
          description: contract.description,
          file_url: contract.file_url,
          file_name: contract.file_name,
          created_by: user?.id,
          status: 'draft', // Always start as draft
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      // Fetch fields from original contract
      const { data: originalFields, error: fieldsError } = await supabase
        .from('signature_fields')
        .select('*')
        .eq('contract_id', contract.id)
        .order('display_order', { ascending: true });

      if (fieldsError) throw fieldsError;

      // Copy fields to new contract
      if (originalFields && originalFields.length > 0) {
        const newFields = originalFields.map((f: any) => ({
          contract_id: newContract.id,
          field_type: f.field_type,
          label: f.label,
          page_number: f.page_number,
          x_position: f.x_position,
          y_position: f.y_position,
          width: f.width,
          height: f.height,
          required: f.required,
          display_order: f.display_order,
          signer_party: f.signer_party,
        }));

        const { error: insertFieldsError } = await supabase
          .from('signature_fields')
          .insert(newFields);

        if (insertFieldsError) throw insertFieldsError;
      }

      toast.success('Contract duplicated as template! You can now rename it and send to a new party.');
      fetchContracts();
    } catch (error: any) {
      console.error('Error duplicating contract:', error);
      toast.error('Failed to duplicate contract');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const copyShareLink = (contract: SignatureContract) => {
    const slug = generateSlug(contract.title);
    const link = `https://risefootballagency.com/sign/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  // Resolve a possibly-private signature-contracts URL to a usable signed URL
  const resolveContractFileUrl = async (fileUrl: string): Promise<string> => {
    if (!fileUrl) return fileUrl;
    const marker = '/signature-contracts/';
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return fileUrl;
    const path = decodeURIComponent(fileUrl.substring(idx + marker.length).split('?')[0]);
    const { data, error } = await supabase.storage
      .from('signature-contracts')
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      console.error('Failed to sign contract URL', error);
      return fileUrl;
    }
    return data.signedUrl;
  };

  const openEditorDialog = (contract: SignatureContract) => {
    setSelectedContract(contract);
    setResolvedFileUrl(null);
    resolveContractFileUrl(contract.file_url).then(setResolvedFileUrl);
    fetchFields(contract.id);
    setShowEditorDialog(true);
  };

  const openOwnerSignDialog = async (contract: SignatureContract) => {
    setSelectedContract(contract);
    setResolvedFileUrl(null);
    resolveContractFileUrl(contract.file_url).then(setResolvedFileUrl);
    await fetchFields(contract.id);
    // Load existing owner values if any
    setOwnerFieldValues(contract.owner_field_values || {});
    setShowOwnerSignDialog(true);
  };

  const openSubmissionsDialog = (contract: SignatureContract) => {
    setSelectedContract(contract);
    fetchSubmissions(contract.id);
    setShowSubmissionsDialog(true);
  };

  // Signature canvas handling
  useEffect(() => {
    if (showSignatureDialog && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showSignatureDialog]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async (saveToDb: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSignatureField) return;

    const dataUrl = canvas.toDataURL('image/png');
    setOwnerFieldValues(prev => ({ ...prev, [currentSignatureField]: dataUrl }));
    
    // Optionally save to database
    if (saveToDb) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('saved_signatures')
          .insert({
            user_id: user.id,
            name: newSignatureName || 'My Signature',
            signature_data: dataUrl,
          });
        
        if (!error) {
          toast.success('Signature saved to your collection');
          fetchSavedSignatures();
        }
      }
    }
    
    setShowSignatureDialog(false);
    setCurrentSignatureField(null);
    toast.success('Signature applied');
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSignatureField) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOwnerFieldValues(prev => ({ ...prev, [currentSignatureField]: dataUrl }));
      setShowSignatureDialog(false);
      setCurrentSignatureField(null);
      toast.success('Signature uploaded');
    };
    reader.readAsDataURL(file);
  };

  const useSavedSignature = (signature: SavedSignature) => {
    if (!currentSignatureField) return;
    setOwnerFieldValues(prev => ({ ...prev, [currentSignatureField]: signature.signature_data }));
    setShowSignatureDialog(false);
    setCurrentSignatureField(null);
    toast.success('Signature applied');
  };

  const deleteSavedSignature = async (id: string) => {
    const { error } = await supabase
      .from('saved_signatures')
      .delete()
      .eq('id', id);
    
    if (!error) {
      toast.success('Signature deleted');
      fetchSavedSignatures();
    }
  };

  const handleOwnerFieldValueChange = (fieldId: string, value: string) => {
    setOwnerFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSignatureStart = (fieldId: string) => {
    setCurrentSignatureField(fieldId);
    setSignatureTab('draw');
    setShowSignatureDialog(true);
  };

  const saveOwnerSignature = async () => {
    if (!selectedContract) return;

    // Check if all owner fields are filled
    const ownerFields = fields.filter(f => f.signer_party === 'owner');
    for (const field of ownerFields) {
      if (!ownerFieldValues[field.id]) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    // Check if there are counterparty fields - if not, complete immediately
    const counterpartyFields = fields.filter(f => f.signer_party === 'counterparty');
    const hasCounterpartyFields = counterpartyFields.length > 0;
    const newStatus = hasCounterpartyFields ? 'active' : 'completed';

    setSaving(true);
    try {
      const { error } = await supabase
        .from('signature_contracts')
        .update({
          owner_field_values: ownerFieldValues,
          owner_signed_at: new Date().toISOString(),
          status: newStatus,
        })
        .eq('id', selectedContract.id);

      if (error) throw error;

      if (hasCounterpartyFields) {
        toast.success('Your signature saved! Contract is now ready for the other party.');
      } else {
        toast.success('Contract signed and completed! You can now download the signed PDF.');
      }
      setShowOwnerSignDialog(false);
      fetchContracts();
    } catch (error: any) {
      console.error('Error saving owner signature:', error);
      toast.error('Failed to save signature');
    } finally {
      setSaving(false);
    }
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

  const toggleMandate = async (contract: SignatureContract, next: boolean) => {
    // Optimistic local update
    setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, is_mandate: next } : c));
    const { error } = await supabase
      .from('signature_contracts')
      .update({ is_mandate: next })
      .eq('id', contract.id);
    if (error) {
      toast.error('Failed to update mandate flag');
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, is_mandate: !next } : c));
      return;
    }
    toast.success(next ? 'Marked as Mandate' : 'Mandate flag removed');
  };

  // Check if all owner fields are filled
  const areAllOwnerFieldsFilled = () => {
    const ownerFields = fields.filter(f => f.signer_party === 'owner');
    if (ownerFields.length === 0) return true;
    return ownerFields.every(field => !!ownerFieldValues[field.id]);
  };

  const hasOwnerFields = (contract: SignatureContract) => {
    // We need to check if there are owner fields - for now check if owner_signed_at is null
    return !contract.owner_signed_at;
  };

  const handleExportPDF = async (contract: SignatureContract, contractFieldsData: FieldPosition[], submission?: SignatureSubmission) => {
    setExporting(true);
    try {
      // Combine owner values and submission values
      const allFieldValues: Record<string, string> = {};
      
      // Add owner field values
      if (contract.owner_field_values) {
        Object.entries(contract.owner_field_values).forEach(([fieldId, value]) => {
          if (typeof value === 'string') {
            allFieldValues[fieldId] = value;
          }
        });
      }
      
      // Add submission field values
      // Supports both new format (by field ID) and legacy format (by label)
      if (submission) {
        Object.entries(submission.field_values).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Check if key is a field ID (UUID format) or a label
            const isFieldId = contractFieldsData.some(f => f.id === key);
            if (isFieldId) {
              // New format: key is the field ID
              allFieldValues[key] = value;
            } else {
              // Legacy format: key is the label, find the counterparty field with this label
              const field = contractFieldsData.find(f => f.label === key && f.signer_party === 'counterparty');
              if (field) {
                allFieldValues[field.id] = value;
              }
            }
          }
        });
      }

      // Prepare field data for export
      const fieldData = contractFieldsData.map(f => ({
        ...f,
        value: allFieldValues[f.id] || undefined,
      }));

      console.log('Exporting PDF with fields:', fieldData);
      console.log('Field values:', allFieldValues);

      const filename = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`;
      await downloadSignedContractPDF(contract.file_url, fieldData, filename);
      
      toast.success('PDF exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Check if contract is signed by both parties
  const isSignedByBoth = (contract: SignatureContract) => {
    return contract.owner_signed_at && submissions.some(s => s.contract_id === contract.id);
  };

  // Group contracts by status
  const draftContracts = contracts.filter(c => c.status === 'draft');
  const activeContracts = contracts.filter(c => c.status === 'active');
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const expiredContracts = contracts.filter(c => c.status === 'expired');

  // Contract card component
  const ContractCard = ({ contract, contractSubmissions, contractFields }: { contract: SignatureContract; contractSubmissions?: SignatureSubmission[]; contractFields?: FieldPosition[] }) => {
    // Check if there are counterparty fields
    const hasCounterpartyFields = contractFields ? contractFields.some(f => f.signer_party === 'counterparty') : true;
    // Contract is complete if: (owner signed AND counterparty signed) OR (owner signed AND no counterparty fields)
    const signedByBoth = contract.owner_signed_at && (
      (contractSubmissions && contractSubmissions.length > 0) || 
      !hasCounterpartyFields
    );
    
    return (
      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">{contract.title}</h4>
              <Badge variant={getStatusColor(contract.status)}>
                {contract.status}
              </Badge>
              {contract.owner_signed_at && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  You signed
                </Badge>
              )}
              {signedByBoth && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <Users className="h-3 w-3 mr-1" />
                  {hasCounterpartyFields ? 'Signed by both parties' : 'Completed'}
                </Badge>
              )}
              {contract.is_mandate && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Mandate
                </Badge>
              )}
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
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <Switch
                checked={!!contract.is_mandate}
                onCheckedChange={(v) => toggleMandate(contract, !!v)}
              />
              <span>Mark as Mandate (lets the other party download Proof of Mandate after signing)</span>
            </label>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {signedByBoth && (
              <Button
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={exporting}
                onClick={async () => {
                  // Use the pre-fetched fields from allContractFields
                  const fieldsForContract = contractFields || allContractFields[contract.id] || [];
                  if (fieldsForContract.length === 0) {
                    toast.error('No field data found for this contract');
                    return;
                  }
                  // Export with the first submission if exists, otherwise just owner values
                  if (contractSubmissions && contractSubmissions[0]) {
                    await handleExportPDF(contract, fieldsForContract, contractSubmissions[0]);
                  } else {
                    // No counterparty submission - export with just owner values
                    await handleExportPDF(contract, fieldsForContract);
                  }
                }}
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Download Signed PDF
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditorDialog(contract)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Edit Fields
            </Button>
            
            {!contract.owner_signed_at && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => openOwnerSignDialog(contract)}
              >
                <PenTool className="h-4 w-4 mr-1" />
                Sign My Parts
              </Button>
            )}
            
            {contract.owner_signed_at && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyShareLink(contract)}
              >
                <Link className="h-4 w-4 mr-1" />
                Copy Link for Other Party
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => openSubmissionsDialog(contract)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Submissions
            </Button>
            
            {/* Duplicate as Template button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => duplicateContract(contract)}
              title="Duplicate as template"
            >
              <Copy className="h-4 w-4 mr-1" />
              Use as Template
            </Button>
            
            {/* Password button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedContractForPassword(contract);
                setContractPassword('');
                setShowPasswordDialog(true);
              }}
              title={contract.view_password ? "Change password" : "Set password"}
            >
              <Lock className="h-4 w-4 mr-1" />
              {contract.view_password ? 'Password Set' : 'Set Password'}
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
    );
  };

  // Collapsible section component
  const ContractSection = ({ 
    title, 
    contracts: sectionContracts, 
    open, 
    onOpenChange,
    badgeColor,
  }: { 
    title: string; 
    contracts: SignatureContract[]; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    badgeColor: string;
  }) => {
    if (sectionContracts.length === 0) return null;
    
    return (
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-medium">{title}</span>
              <Badge variant="secondary" className={badgeColor}>
                {sectionContracts.length}
              </Badge>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {sectionContracts.map((contract) => (
            <ContractCard 
              key={contract.id} 
              contract={contract} 
              contractSubmissions={allSubmissions.filter(s => s.contract_id === contract.id)}
              contractFields={allContractFields[contract.id] || []}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
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
        <div className="space-y-4">
          <ContractSection 
            title="Active" 
            contracts={activeContracts} 
            open={activeOpen} 
            onOpenChange={setActiveOpen}
            badgeColor="bg-blue-500 text-white"
          />
          <ContractSection 
            title="Draft" 
            contracts={draftContracts} 
            open={draftOpen} 
            onOpenChange={setDraftOpen}
            badgeColor="bg-gray-500 text-white"
          />
          <ContractSection 
            title="Completed" 
            contracts={completedContracts} 
            open={completedOpen} 
            onOpenChange={setCompletedOpen}
            badgeColor="bg-green-500 text-white"
          />
          <ContractSection 
            title="Expired" 
            contracts={expiredContracts} 
            open={expiredOpen} 
            onOpenChange={setExpiredOpen}
            badgeColor="bg-red-500 text-white"
          />
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
              <Label htmlFor="file">Document (PDF only) *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">{selectedFile.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="view_password">View Password (optional)</Label>
              <Input
                id="view_password"
                type="password"
                placeholder="Leave blank for no password"
                value={formData.view_password}
                onChange={(e) => setFormData({ ...formData, view_password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                If set, recipients will need this password to view the contract
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Editor Dialog */}
      <Dialog open={showEditorDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEditorDialog(false);
          setSelectedContract(null);
          setResolvedFileUrl(null);
          setFields([]);
        }
      }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Edit Fields - {selectedContract?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Use green "Me" for fields you'll sign, orange "Other Party" for fields the counterparty will sign
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-4">
            {selectedContract && resolvedFileUrl ? (
              <PDFDocumentViewer
                fileUrl={resolvedFileUrl}
                fields={fields}
                onFieldsChange={setFields}
                mode="edit"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading document...
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowEditorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFields} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Fields
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner Sign Dialog */}
      <Dialog open={showOwnerSignDialog} onOpenChange={(open) => {
        if (!open) {
          setShowOwnerSignDialog(false);
          setSelectedContract(null);
          setResolvedFileUrl(null);
          setFields([]);
          setOwnerFieldValues({});
        }
      }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Sign Your Parts - {selectedContract?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fill in the green fields assigned to you. After saving, you can share the link with the other party.
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-4">
            {selectedContract && resolvedFileUrl ? (
              <PDFDocumentViewer
                fileUrl={resolvedFileUrl}
                fields={fields}
                mode="owner-sign"
                fieldValues={ownerFieldValues}
                onFieldValueChange={handleOwnerFieldValueChange}
                onSignatureStart={handleSignatureStart}
                signerPartyFilter="owner"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading document...
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex-1 text-sm text-muted-foreground">
              {fields.filter(f => f.signer_party === 'owner').length > 0 ? (
                <>
                  {Object.keys(ownerFieldValues).filter(k => ownerFieldValues[k]).length} / {fields.filter(f => f.signer_party === 'owner').length} fields completed
                </>
              ) : (
                <span className="text-amber-600">No fields assigned to you. Add fields in Edit mode first.</span>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowOwnerSignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveOwnerSignature} 
              disabled={saving || !areAllOwnerFieldsFilled()} 
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {areAllOwnerFieldsFilled() ? 'Save & Activate' : 'Fill All Fields First'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog with Options */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Your Signature</DialogTitle>
          </DialogHeader>
          
          <Tabs value={signatureTab} onValueChange={(v) => setSignatureTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="draw" className="gap-1">
                <PenTool className="w-4 h-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1">
                <BookMarked className="w-4 h-4" />
                Saved
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="draw" className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={200}
                  className="border rounded w-full touch-none cursor-crosshair bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Signature name (for saving)"
                  value={newSignatureName}
                  onChange={(e) => setNewSignatureName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={clearSignature}>
                  Clear
                </Button>
                <Button variant="outline" onClick={() => saveSignature(true)}>
                  <Save className="w-4 h-4 mr-1" />
                  Use & Save
                </Button>
                <Button onClick={() => saveSignature(false)}>
                  Use Signature
                </Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an image of your signature (PNG, JPG)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="space-y-4">
              {savedSignatures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No saved signatures yet.</p>
                  <p className="text-sm">Draw a signature and click "Use & Save" to save it.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {savedSignatures.map((sig) => (
                    <div key={sig.id} className="border rounded-lg p-3 flex items-center gap-3">
                      <img 
                        src={sig.signature_data} 
                        alt={sig.name} 
                        className="h-12 flex-1 object-contain bg-white border rounded"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{sig.name}</span>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => useSavedSignature(sig)}>
                            Use
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-destructive"
                            onClick={() => deleteSavedSignature(sig.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions - {selectedContract?.title}</DialogTitle>
          </DialogHeader>
          
          {/* Owner's signature section */}
          {selectedContract?.owner_signed_at && selectedContract?.owner_field_values && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Your Signature</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Signed: {new Date(selectedContract.owner_signed_at).toLocaleString()}
              </p>
              <div className="space-y-2">
                {Object.entries(selectedContract.owner_field_values).map(([key, value]) => {
                  const field = fields.find(f => f.id === key);
                  return (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{field?.label || key}:</span>{' '}
                      {typeof value === 'string' && value.startsWith('data:image') ? (
                        <img src={value} alt="Signature" className="h-12 mt-1 border rounded bg-white" />
                      ) : (
                        <span>{value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No counterparty submissions yet
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">{sub.signer_name}</span>
                      <span className="text-sm text-muted-foreground">({sub.signer_email})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedContract) {
                          handleExportPDF(selectedContract, fields, sub);
                        }
                      }}
                      disabled={exporting}
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Export PDF
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Signed: {new Date(sub.signed_at).toLocaleString()}
                  </p>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 mb-3 border-l-2 border-muted pl-2">
                    <div>IP: {sub.ip_address || '—'}</div>
                    <div>Intent confirmed: {sub.intent_consent_at ? new Date(sub.intent_consent_at).toLocaleString() : '—'}</div>
                    <div>Document hash: <span className="font-mono break-all">{sub.document_hash || '—'}</span></div>
                    <div>Signed PDF hash: <span className="font-mono break-all">{sub.signed_pdf_hash || '—'}</span></div>
                    <div className="line-clamp-2">User agent: {sub.user_agent || '—'}</div>
                    {sub.signed_pdf_url && (
                      <button
                        type="button"
                        className="text-primary underline mt-1"
                        onClick={async () => {
                          const { data, error } = await supabase.storage
                            .from('signature-contracts')
                            .createSignedUrl(sub.signed_pdf_url!, 60 * 10);
                          if (error || !data?.signedUrl) {
                            toast.error('Could not load signed PDF');
                            return;
                          }
                          window.open(data.signedUrl, '_blank');
                        }}
                      >
                        Download immutable signed PDF
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(sub.field_values).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'string' && value.startsWith('data:image') ? (
                          <img src={value} alt="Signature" className="h-12 mt-1 border rounded" />
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

      {/* Contract Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedContractForPassword?.view_password ? 'Change Contract Password' : 'Set Contract Password'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contract-password">Password</Label>
              <Input
                id="contract-password"
                type="password"
                value={contractPassword}
                onChange={(e) => setContractPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Recipients will need to enter this password to view and sign the contract.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            {selectedContractForPassword?.view_password && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (!selectedContractForPassword) return;
                  const { error } = await supabase
                    .from('signature_contracts')
                    .update({ view_password: null })
                    .eq('id', selectedContractForPassword.id);
                  if (error) {
                    toast.error('Failed to remove password');
                  } else {
                    toast.success('Password removed');
                    fetchContracts();
                    setShowPasswordDialog(false);
                  }
                }}
              >
                Remove Password
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!selectedContractForPassword || !contractPassword.trim()) {
                toast.error('Please enter a password');
                return;
              }
              if (contractPassword.length < 4) {
                toast.error('Password must be at least 4 characters');
                return;
              }
              const passwordHash = btoa(contractPassword);
              const { error } = await supabase
                .from('signature_contracts')
                .update({ view_password: passwordHash })
                .eq('id', selectedContractForPassword.id);
              if (error) {
                toast.error('Failed to set password');
              } else {
                toast.success('Password set successfully');
                fetchContracts();
                setShowPasswordDialog(false);
              }
            }}>
              {selectedContractForPassword?.view_password ? 'Update Password' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractSignature;
