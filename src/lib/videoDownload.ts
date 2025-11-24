import { toast } from "sonner";

export const downloadVideo = async (videoUrl: string, fileName: string) => {
  try {
    toast.info("Starting download...");
    
    // Use direct download link with Content-Disposition header
    // This works better than blob fetch for Supabase storage URLs
    const url = new URL(videoUrl);
    url.searchParams.set('download', `${fileName}.mp4`);
    
    const link = document.createElement('a');
    link.href = url.toString();
    link.download = `${fileName}.mp4`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Download started");
  } catch (error) {
    console.error('Download error:', error);
    toast.error("Failed to download video. Please try opening in a new tab instead.");
  }
};
