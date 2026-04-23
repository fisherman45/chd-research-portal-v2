import React from 'react';
import { generateReportPDF, imageToBase64 } from './pdfGenerator';

/**
 * Enhanced Approve button with PDF generation
 * Integrates with the existing ApprovalsTab component
 */
export function ApproveWithPDFButton({ reportId, report, onApprove, isLoading, logoPath = '/chd-logo.png' }) {
  const [generating, setGenerating] = React.useState(false);

  const handleApproveAndDownloadPDF = async () => {
    // First approve the report on the server
    if (onApprove) {
      onApprove(reportId);
    }

    // Then generate and download the PDF
    try {
      setGenerating(true);

      // Try to load logo - if it fails, PDF will still generate without it
      let logoBase64 = null;
      try {
        logoBase64 = await imageToBase64(logoPath);
      } catch (err) {
        console.warn('Could not load logo, continuing without it:', err);
      }

      // Generate the PDF
      await generateReportPDF(report, logoBase64);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // The report was still approved, so this is not a critical error
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleApproveAndDownloadPDF}
      disabled={isLoading || generating}
      style={{
        padding: '9px 22px',
        background: '#16a34a',
        color: '#fff',
        border: 'none',
        borderRadius: 7,
        fontSize: '.82rem',
        fontWeight: 600,
        cursor: isLoading || generating ? 'not-allowed' : 'pointer',
        fontFamily: "'Outfit',system-ui,sans-serif",
        opacity: isLoading || generating ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {generating ? '⌛ Generating PDF...' : '✓ Approve & Publish'}
    </button>
  );
}

/**
 * Download Report as PDF button - for already published reports
 * Can be used in the main reports view
 */
export function DownloadReportPDFButton({ report, logoPath = '/chd-logo.png' }) {
  const [generating, setGenerating] = React.useState(false);

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true);

      // Try to load logo
      let logoBase64 = null;
      try {
        logoBase64 = await imageToBase64(logoPath);
      } catch (err) {
        console.warn('Could not load logo, continuing without it:', err);
      }

      // Generate and download the PDF
      await generateReportPDF(report, logoBase64);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPDF}
      disabled={generating}
      style={{
        padding: '8px 18px',
        background: '#06262d',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontSize: '.76rem',
        fontWeight: 600,
        cursor: generating ? 'not-allowed' : 'pointer',
        fontFamily: "'Outfit',system-ui,sans-serif",
        opacity: generating ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {generating ? '⌛ Generating...' : '↓ Download PDF'}
    </button>
  );
}
