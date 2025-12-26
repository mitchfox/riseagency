/**
 * Opens an external URL safely, avoiding browser blocking issues.
 * Uses an anchor element click instead of window.open for better cross-origin handling.
 */
export const openExternalUrl = (url: string) => {
  if (!url) return;
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  // For PDF files, use download attribute as fallback
  if (url.includes('.pdf')) {
    // Extract filename from URL if possible
    const filename = url.split('/').pop()?.split('?')[0] || 'document.pdf';
    link.download = filename;
  }
  
  // Append to body, click, then remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads a file from a URL by fetching it and creating a blob URL.
 * This is useful when direct linking is blocked by CORS.
 */
export const downloadFile = async (url: string, filename?: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || url.split('/').pop()?.split('?')[0] || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to download file:', error);
    // Fallback to opening in new tab
    openExternalUrl(url);
  }
};
