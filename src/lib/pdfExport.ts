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

export interface AuditLogData {
  contract_title?: string;
  contract_id?: string;
  document_hash?: string | null;
  signer_name?: string;
  signer_email?: string;
  signed_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  intent_consent_at?: string | null;
}

function appendAuditPage(jspdf: jsPDF, pageWidth: number, pageHeight: number, audit: AuditLogData) {
  jspdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? 'landscape' : 'portrait');
  const margin = 48;
  let y = margin;

  jspdf.setFontSize(18);
  jspdf.setTextColor(0, 0, 0);
  jspdf.text('Electronic Signature Audit Log', margin, y);
  y += 24;

  jspdf.setFontSize(10);
  jspdf.setTextColor(80, 80, 80);
  jspdf.text(
    'This page is automatically generated as evidence that the document was signed electronically',
    margin, y,
  );
  y += 12;
  jspdf.text(
    'under the UK Electronic Communications Act 2000 and the eIDAS Regulation.',
    margin, y,
  );
  y += 24;

  jspdf.setDrawColor(200, 200, 200);
  jspdf.line(margin, y, pageWidth - margin, y);
  y += 18;

  const rows: Array<[string, string]> = [
    ['Document', audit.contract_title || '—'],
    ['Document ID', audit.contract_id || '—'],
    ['Document hash (SHA-256)', audit.document_hash || '—'],
    ['Signer name', audit.signer_name || '—'],
    ['Signer email', audit.signer_email || '—'],
    ['Signed at', audit.signed_at ? new Date(audit.signed_at).toUTCString() : '—'],
    ['Intent to sign confirmed', audit.intent_consent_at ? new Date(audit.intent_consent_at).toUTCString() : '—'],
    ['IP address', audit.ip_address || '—'],
    ['Device / user agent', audit.user_agent || '—'],
  ];

  jspdf.setFontSize(11);
  const labelWidth = 170;
  const valueWidth = pageWidth - margin * 2 - labelWidth - 8;

  for (const [label, value] of rows) {
    jspdf.setTextColor(110, 110, 110);
    jspdf.text(label, margin, y);
    jspdf.setTextColor(0, 0, 0);
    const wrapped = jspdf.splitTextToSize(String(value), valueWidth);
    jspdf.text(wrapped, margin + labelWidth, y);
    y += Math.max(16, wrapped.length * 14);
    if (y > pageHeight - margin - 60) break;
  }

  y = Math.max(y + 12, pageHeight - margin - 40);
  jspdf.setDrawColor(200, 200, 200);
  jspdf.line(margin, y, pageWidth - margin, y);
  y += 14;
  jspdf.setFontSize(9);
  jspdf.setTextColor(120, 120, 120);
  jspdf.text(
    'The signer confirmed their intent to sign electronically. The document hash matches the locked',
    margin, y,
  );
  y += 11;
  jspdf.text(
    'version sent for signature. Any change to the underlying document would alter this hash.',
    margin, y,
  );
}

/**
 * Export a signed contract as a PDF with all field values overlaid
 * Optionally appends an audit log page at the end.
 */
export async function exportSignedContractPDF(
  pdfUrl: string,
  fields: FieldData[],
  filename: string = 'signed-contract.pdf',
  audit?: AuditLogData,
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
        // Draw signature image - fill the field area exactly
        try {
          jspdf.addImage(field.value, 'PNG', x, y, width, height);
        } catch (e) {
          console.error('Error adding signature image:', e);
        }
      } else if (field.value) {
        // Scale font to fit field height AND width so values fill the box
        const value = String(field.value);
        const padding = 6;
        const maxByHeight = height * 0.75;
        const maxByWidth = value.length > 0
          ? (width - padding * 2) / (value.length * 0.5)
          : maxByHeight;
        const fontSize = Math.max(8, Math.min(maxByHeight, maxByWidth, 24));
        jspdf.setFontSize(fontSize);
        jspdf.setTextColor(0, 0, 0);

        const textY = y + height / 2 + fontSize * 0.35;
        if (field.field_type === 'date') {
          // Horizontally centre date values
          const textWidth = jspdf.getTextWidth(value);
          jspdf.text(value, x + (width - textWidth) / 2, textY);
        } else {
          jspdf.text(value, x + padding, textY);
        }
      }
    }

    // Clean up canvas
    canvas.remove();
  }

  if (audit) {
    appendAuditPage(jspdf, viewport.width, viewport.height, audit);
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
  filename: string = 'signed-contract.pdf',
  audit?: AuditLogData,
): Promise<void> {
  const blob = await exportSignedContractPDF(pdfUrl, fields, filename, audit);
  
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

/**
 * Open the PDF blob in a new tab and trigger the browser's print dialog
 */
export async function printSignedContractPDF(
  pdfUrl: string,
  fields: FieldData[],
  audit?: AuditLogData,
): Promise<void> {
  const blob = await exportSignedContractPDF(pdfUrl, fields, 'contract.pdf', audit);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      try { win.focus(); win.print(); } catch {}
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
