import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, X, Loader2, GitCompare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UploadedDocument {
  id: string;
  name: string;
  content: string;
}

interface ContractCrossReferenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContractCrossReference = ({ open, onOpenChange }: ContractCrossReferenceProps) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const text = await extractTextFromFile(file);
        if (text) {
          setDocuments(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              name: file.name,
              content: text
            }
          ]);
        }
      }
      toast.success(`${files.length} document(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process some documents');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const extractTextFromFile = async (file: File): Promise<string | null> => {
    const fileType = file.type;
    
    if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // For PDFs and DOCs, we'll read as text and let the AI handle parsing
    // In a production environment, you'd use a proper PDF/DOC parser
    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Read PDF as base64 for AI processing
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return `[PDF Document: ${file.name}]\nBase64 content for AI analysis:\n${base64.substring(0, 50000)}...`;
    }
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileType === 'application/msword' ||
        file.name.endsWith('.doc') || 
        file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return `[Word Document: ${file.name}]\nBase64 content for AI analysis:\n${base64.substring(0, 50000)}...`;
    }

    // Fallback: try reading as text
    try {
      return await file.text();
    } catch {
      toast.error(`Unable to read file: ${file.name}`);
      return null;
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const analyzeContracts = async () => {
    if (documents.length < 2) {
      toast.error('Please upload at least 2 documents to compare');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('contract-cross-reference', {
        body: {
          documents: documents.map(doc => ({
            name: doc.name,
            content: doc.content.substring(0, 30000) // Limit content size
          }))
        }
      });

      if (error) throw error;

      setAnalysisResult(data.analysis);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze contracts');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setDocuments([]);
    setAnalysisResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Contract Cross-Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Upload Documents</h3>
              {documents.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetAnalysis}>
                  Clear All
                </Button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, or TXT files</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{documents.length} document(s) uploaded</p>
                <div className="grid gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
                          {doc.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <Button
              onClick={analyzeContracts}
              disabled={documents.length < 2 || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Contracts...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Analyze & Compare ({documents.length} documents)
                </>
              )}
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-4">
              <h3 className="font-medium">Analysis Results</h3>
              <div className="p-4 bg-muted rounded-lg prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-sm">{analysisResult}</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractCrossReference;
