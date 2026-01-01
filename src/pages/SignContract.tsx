import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, Loader2 } from "lucide-react";

interface SignatureContract {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  status: string;
}

interface SignatureField {
  id: string;
  contract_id: string;
  field_type: 'text' | 'date' | 'signature';
  label: string;
  required: boolean;
  display_order: number;
}

const SignContract = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contract, setContract] = useState<SignatureContract | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signerInfo, setSignerInfo] = useState({ name: '', email: '' });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('signature_contracts')
        .select('*')
        .eq('share_token', token)
        .eq('status', 'active')
        .single();

      if (contractError || !contractData) {
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
        const typedFields = fieldsData as SignatureField[];
        setFields(typedFields);
        
        // Initialize field values
        const initialValues: Record<string, string> = {};
        typedFields?.forEach((field) => {
          initialValues[field.label] = '';
        });
        setFieldValues(initialValues);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (label: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [label]: value }));
  };

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
    
    if (currentSignatureField) {
      setFieldValues((prev) => ({ ...prev, [currentSignatureField]: '' }));
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSignatureField) return;

    const dataUrl = canvas.toDataURL('image/png');
    setFieldValues((prev) => ({ ...prev, [currentSignatureField]: dataUrl }));
    setCurrentSignatureField(null);
    toast.success('Signature saved');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract) return;

    // Validate signer info
    if (!signerInfo.name || !signerInfo.email) {
      toast.error('Please enter your name and email');
      return;
    }

    // Validate required fields
    for (const field of fields) {
      if (field.required && !fieldValues[field.label]) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('signature_submissions')
        .insert([{
          contract_id: contract.id,
          signer_name: signerInfo.name,
          signer_email: signerInfo.email,
          field_values: fieldValues,
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;

      setSubmitted(true);
      toast.success('Contract signed successfully!');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (currentSignatureField && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [currentSignatureField]);

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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Contract Signed!</h1>
          <p className="text-muted-foreground mb-4">
            Thank you for signing. Your submission has been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold">{contract.title}</h1>
          {contract.description && (
            <p className="text-muted-foreground mt-2">{contract.description}</p>
          )}
        </div>

        {/* Document Preview/Download */}
        <div className="border rounded-lg p-4 mb-6 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{contract.file_name}</p>
                <p className="text-sm text-muted-foreground">Contract Document</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.open(contract.file_url, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Signing Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Signer Info */}
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold">Your Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="signer-name">Full Name *</Label>
                <Input
                  id="signer-name"
                  value={signerInfo.name}
                  onChange={(e) => setSignerInfo({ ...signerInfo, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signer-email">Email *</Label>
                <Input
                  id="signer-email"
                  type="email"
                  value={signerInfo.email}
                  onChange={(e) => setSignerInfo({ ...signerInfo, email: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Dynamic Fields */}
          {fields.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4">
              <h2 className="font-semibold">Required Fields</h2>
              {fields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label} {field.required && '*'}
                  </Label>
                  
                  {field.field_type === 'text' && (
                    <Input
                      id={field.id}
                      value={fieldValues[field.label] || ''}
                      onChange={(e) => handleFieldChange(field.label, e.target.value)}
                      required={field.required}
                    />
                  )}
                  
                  {field.field_type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={fieldValues[field.label] || ''}
                      onChange={(e) => handleFieldChange(field.label, e.target.value)}
                      required={field.required}
                    />
                  )}
                  
                  {field.field_type === 'signature' && (
                    <div className="mt-2">
                      {fieldValues[field.label] ? (
                        <div className="border rounded-lg p-2 bg-white">
                          <img 
                            src={fieldValues[field.label]} 
                            alt="Signature" 
                            className="h-20 mx-auto"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => {
                              setCurrentSignatureField(field.label);
                              setFieldValues((prev) => ({ ...prev, [field.label]: '' }));
                            }}
                          >
                            Re-sign
                          </Button>
                        </div>
                      ) : currentSignatureField === field.label ? (
                        <div className="border rounded-lg p-4 bg-white">
                          <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            className="border rounded w-full touch-none cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearSignature}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={saveSignature}
                            >
                              Save Signature
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-20"
                          onClick={() => setCurrentSignatureField(field.label)}
                        >
                          Click to Sign
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Signed Contract
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignContract;
