import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, CheckCircle, Loader2, Download, PenTool, Upload } from "lucide-react";
import { PDFDocumentViewer, FieldPosition } from "@/components/staff/PDFDocumentViewer";
import { downloadSignedContractPDF } from "@/lib/pdfExport";

interface SignatureContract {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  status: string;
  owner_field_values: Record<string, string> | null;
}

const SignContract = () => {
  const { token } = useParams<{ token: string }>(); // This is now the slug (document title)
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [contract, setContract] = useState<SignatureContract | null>(null);
  const [fields, setFields] = useState<FieldPosition[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signerInfo, setSignerInfo] = useState({ name: '', email: '' });
  
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);
  const [signatureTab, setSignatureTab] = useState<'draw' | 'upload'>('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    try {
      // First get all active contracts to find by slug match
      const { data: contractsData, error: contractsError } = await supabase
        .from('signature_contracts')
        .select('*')
        .eq('status', 'active');

      if (contractsError) {
        toast.error('Failed to load contract');
        setLoading(false);
        return;
      }

      // Find contract by matching slug from title
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      };

      const contractData = contractsData?.find(c => generateSlug(c.title) === token);

      if (!contractData) {
        toast.error('Contract not found or is no longer active');
        setLoading(false);
        return;
      }

      setContract(contractData as SignatureContract);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('signature_fields')
        .select('*')
        .eq('contract_id', contractData.id)
        .order('display_order', { ascending: true });

      if (fieldsError) {
        console.error('Error fetching fields:', fieldsError);
      } else {
        const typedFields: FieldPosition[] = (fieldsData || []).map((f: any) => ({
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
        setFields(typedFields);
        
        // Pre-fill owner field values (shown as read-only)
        if (contractData.owner_field_values && typeof contractData.owner_field_values === 'object') {
          setFieldValues(contractData.owner_field_values as Record<string, string>);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    // Only allow editing counterparty fields
    const field = fields.find(f => f.id === fieldId);
    if (field?.signer_party === 'owner') return;
    
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSignatureStart = (fieldId: string) => {
    // Only allow signing counterparty fields
    const field = fields.find(f => f.id === fieldId);
    if (field?.signer_party === 'owner') {
      toast.error('This field has already been signed');
      return;
    }
    
    setCurrentSignatureField(fieldId);
    setShowSignatureDialog(true);
  };

  // Canvas signature handling
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

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSignatureField) return;

    const dataUrl = canvas.toDataURL('image/png');
    setFieldValues((prev) => ({ ...prev, [currentSignatureField]: dataUrl }));
    setShowSignatureDialog(false);
    setCurrentSignatureField(null);
    toast.success('Signature saved');
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSignatureField) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFieldValues((prev) => ({ ...prev, [currentSignatureField]: dataUrl }));
      setShowSignatureDialog(false);
      setCurrentSignatureField(null);
      toast.success('Signature uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!contract) return;

    if (!signerInfo.name || !signerInfo.email) {
      toast.error('Please enter your name and email');
      return;
    }

    // Check all counterparty fields are filled
    const counterpartyFields = fields.filter(f => f.signer_party === 'counterparty');
    for (const field of counterpartyFields) {
      if (!fieldValues[field.id]) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Only store counterparty field values
      const counterpartyValues: Record<string, string> = {};
      counterpartyFields.forEach(f => {
        counterpartyValues[f.label] = fieldValues[f.id] || '';
      });

      const { error } = await supabase
        .from('signature_submissions')
        .insert([{
          contract_id: contract.id,
          signer_name: signerInfo.name,
          signer_email: signerInfo.email,
          field_values: counterpartyValues,
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;

      // Send notification about contract being signed
      try {
        await supabase.from('staff_notification_events').insert({
          event_type: 'contract_signed',
          title: 'Contract Signed',
          body: `${signerInfo.name} signed "${contract.title}"`,
          event_data: {
            contract_id: contract.id,
            contract_title: contract.title,
            signer_name: signerInfo.name,
            signer_email: signerInfo.email,
          },
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      setSubmitted(true);
      toast.success('Contract signed successfully!');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Contract Not Found</h1>
          <p className="text-muted-foreground">
            This contract link is invalid or the contract is no longer active.
          </p>
        </div>
      </div>
    );
  }

  const handleExportPDF = async () => {
    if (!contract) return;
    
    setExporting(true);
    try {
      const fieldData = fields.map(f => ({
        ...f,
        value: fieldValues[f.id] || undefined,
      }));

      const filename = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`;
      await downloadSignedContractPDF(contract.file_url, fieldData, filename);
      
      toast.success('PDF exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Contract Signed!</h1>
          <p className="text-muted-foreground mb-4">
            Thank you for signing. Your submission has been recorded.
          </p>
          <Button onClick={handleExportPDF} disabled={exporting} size="lg">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Signed PDF
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const counterpartyFields = fields.filter(f => f.signer_party === 'counterparty');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {contract.title}
              </h1>
              {contract.description && (
                <p className="text-sm text-muted-foreground mt-1">{contract.description}</p>
              )}
              <p className="text-xs text-orange-600 mt-1">
                Please fill in the orange fields below to complete your signature
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Your Name"
                  value={signerInfo.name}
                  onChange={(e) => setSignerInfo({ ...signerInfo, name: e.target.value })}
                  className="w-40"
                />
                <Input
                  placeholder="Your Email"
                  type="email"
                  value={signerInfo.email}
                  onChange={(e) => setSignerInfo({ ...signerInfo, email: e.target.value })}
                  className="w-48"
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Document viewer with signing */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)]">
          <PDFDocumentViewer
            fileUrl={contract.file_url}
            fields={fields}
            mode="sign"
            fieldValues={fieldValues}
            onFieldValueChange={handleFieldValueChange}
            onSignatureStart={handleSignatureStart}
            signerPartyFilter="all"
          />
        </div>
      </div>

      {/* Signature Dialog with Options */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Your Signature</DialogTitle>
          </DialogHeader>
          
          <Tabs value={signatureTab} onValueChange={(v) => setSignatureTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw" className="gap-1">
                <PenTool className="w-4 h-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1">
                <Upload className="w-4 h-4" />
                Upload
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
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={clearSignature}>
                  Clear
                </Button>
                <Button onClick={saveSignature}>
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
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignContract;
