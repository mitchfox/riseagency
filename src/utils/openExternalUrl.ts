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
    const filename = url.split('/').pop()?.split('?')[0] || 'document.pdf';
    link.download = filename;
  }
  
  // Append to body, click, then remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Opens a mailto link safely for Firefox/Edge compatibility.
 * Uses window.location.href instead of anchor with target=_blank.
 */
export const openMailto = (email: string) => {
  if (!email) return;
  window.location.href = `mailto:${email}`;
};

/**
 * Opens a WhatsApp link safely for Firefox/Edge compatibility.
 */
export const openWhatsApp = (phone: string) => {
  if (!phone) return;
  const cleaned = phone.replace(/[^0-9]/g, '');
  openExternalUrl(`https://wa.me/${cleaned}`);
};

/**
 * Downloads a file from a URL by fetching it and creating a blob URL.
 * For Supabase storage URLs, uses direct download parameter for reliability.
 */
export const downloadFile = async (url: string, filename?: string) => {
  try {
    // For Supabase storage URLs, use direct download parameter
    if (url.includes('supabase.co/storage')) {
      const downloadUrl = url.includes('?') ? `${url}&download=` : `${url}?download=`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || url.split('/').pop()?.split('?')[0] || 'download';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For other URLs, try fetch approach
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
