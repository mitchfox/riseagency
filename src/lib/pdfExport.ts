import jsPDF from 'jspdf';
import { pdfjs } from 'react-pdf';

interface FieldData {
  id: string;
  field_type: 'text' | 'date' | 'signature';
  label: string;
  page_number: number;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  value?: string;
}

/**
 * Export a signed contract as a PDF with all field values overlaid
 */
export async function exportSignedContractPDF(
  pdfUrl: string,
  fields: FieldData[],
  filename: string = 'signed-contract.pdf'
): Promise<Blob> {
  // Load the original PDF
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  
  // Get first page to determine dimensions
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 2 }); // Higher scale for better quality
  
  // Create jsPDF with proper dimensions
  const isLandscape = viewport.width > viewport.height;
  const jspdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [viewport.width, viewport.height],
  });

  // Render each page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (pageNum > 1) {
      jspdf.addPage([viewport.width, viewport.height], isLandscape ? 'landscape' : 'portrait');
    }

    const page = await pdf.getPage(pageNum);
    const pageViewport = page.getViewport({ scale: 2 });
    
    // Create a canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = pageViewport.width;
    canvas.height = pageViewport.height;
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: pageViewport,
    }).promise;

    // Add the page image to the PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    jspdf.addImage(imgData, 'JPEG', 0, 0, pageViewport.width, pageViewport.height);

    // Overlay field values on this page
    const pageFields = fields.filter(f => f.page_number === pageNum && f.value);
    
    for (const field of pageFields) {
      const x = (field.x_position / 100) * pageViewport.width;
      const y = (field.y_position / 100) * pageViewport.height;
      const width = (field.width / 100) * pageViewport.width;
      const height = (field.height / 100) * pageViewport.height;

      if (field.field_type === 'signature' && field.value?.startsWith('data:image')) {
        // Draw signature image
        try {
          jspdf.addImage(field.value, 'PNG', x, y, width, height);
        } catch (e) {
          console.error('Error adding signature image:', e);
        }
      } else if (field.value) {
        // Draw text or date
        jspdf.setFontSize(12);
        jspdf.setTextColor(0, 0, 0);
        
        // Add a white background for better readability
        jspdf.setFillColor(255, 255, 255);
        jspdf.rect(x, y, width, height, 'F');
        
        // Draw the text centered in the field
        jspdf.text(field.value, x + 4, y + height - 6);
      }
    }

    // Clean up canvas
    canvas.remove();
  }

  // Return as blob
  return jspdf.output('blob');
}

/**
 * Download the exported PDF
 */
export async function downloadSignedContractPDF(
  pdfUrl: string,
  fields: FieldData[],
  filename: string = 'signed-contract.pdf'
): Promise<void> {
  const blob = await exportSignedContractPDF(pdfUrl, fields, filename);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
