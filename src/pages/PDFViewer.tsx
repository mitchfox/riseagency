import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const PDFViewer = () => {
  const [searchParams] = useSearchParams();
  const pdfUrl = searchParams.get("url");
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pdfUrl) {
      setError(true);
      setLoading(false);
      return;
    }

    // Directly use the PDF URL in iframe since the bucket is public
    setBlobUrl(pdfUrl);
    setLoading(false);
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Failed to load PDF</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background">
      <iframe
        src={blobUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
    </div>
  );
};

export default PDFViewer;
