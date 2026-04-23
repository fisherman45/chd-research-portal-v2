import jsPDF from 'jspdf';

/* ═══ CHD Brand colours ═══ */
const NAVY   = [6,  38, 45];
const GOLD   = [185,114,49];
const GOLD_L = [197,164,133];
const WHITE  = [255,255,255];
const G200   = [227,231,235];
const G300   = [205,209,216];
const G500   = [107,114,128];
const G700   = [55, 65, 81];

const CAT_COLORS = {
  'macro':          [8,  145,178],
  'equities':       [185,114,49],
  'company-updates':[185,114,49],
  'sector-report':  [185,114,49],
  'fixed-income':   [124, 58,237],
  'outlook':        [22, 163, 74],
  'daily':          [107,114,128],
};

const CAT_LABELS = {
  'macro':          'Macroeconomic',
  'equities':       'Equities',
  'company-updates':'Company Update',
  'sector-report':  'Sector Report',
  'fixed-income':   'Fixed Income',
  'outlook':        'Outlook',
  'daily':          'Daily',
};

const CATEGORY_ACCESS = {
  'macro':          'free',
  'daily':          'free',
  'equities':       'registered',
  'company-updates':'premium',
  'sector-report':  'premium',
  'fixed-income':   'registered',
  'outlook':        'premium',
};

/* ═══ Helpers ═══ */
function setFill(pdf, c) { pdf.setFillColor(c[0], c[1], c[2]); }
function setDraw(pdf, c) { pdf.setDrawColor(c[0], c[1], c[2]); }
function setTxt(pdf,  c) { pdf.setTextColor(c[0], c[1], c[2]); }
function cleanPdfText(value = "") {
  return String(value)
    .replace(/₦/g, "NGN ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ");
}

/** Try to load /chd-logo.png as a base64 data URL */
async function loadLogoBase64() {
  try {
    const res = await fetch('/chd-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Draw the CHD shield logo in code (fallback when no PNG file present).
 * cx, cy = centre. size = half-width.
 */
function drawCHDShield(pdf, cx, cy, size) {
  const w  = size * 2;
  const h  = size * 2.4;
  const x  = cx - size;
  const y  = cy - h / 2;
  const cf = size * 0.22; // chamfer at top corners

  /* Outer shield shape */
  const pts = [
    [x + cf, y],
    [x + w - cf, y],
    [x + w, y + cf * 1.1],
    [x + w, y + h * 0.60],
    [x + w / 2, y + h],
    [x, y + h * 0.60],
    [x, y + cf * 1.1],
  ];
  setFill(pdf, GOLD);
  setDraw(pdf, GOLD);
  pdf.setLineWidth(0);
  pdf.lines(
    pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]),
    pts[0][0], pts[0][1],
    [1, 1], 'F', true
  );

  /* Inner CH monogram (white) */
  const iTop  = y + h * 0.17;
  const iH    = h * 0.48;
  const iX    = x + w * 0.17;
  const iW    = w * 0.66;
  const pw    = w * 0.115; // pillar width
  const barH  = h * 0.08;
  const armH  = h * 0.068;
  const armW  = w * 0.13;

  setFill(pdf, WHITE);

  /* Left vertical bar */
  pdf.rect(iX, iTop, pw, iH, 'F');
  /* Right vertical bar */
  pdf.rect(iX + iW - pw, iTop, pw, iH, 'F');
  /* Crossbar */
  pdf.rect(iX + pw, iTop + iH * 0.43, iW - pw * 2, barH, 'F');

  /* Left C — top arm */
  pdf.rect(iX + pw, iTop, armW, armH, 'F');
  /* Left C — bottom arm */
  pdf.rect(iX + pw, iTop + iH - armH, armW, armH, 'F');

  /* Right C — top arm */
  pdf.rect(iX + iW - pw - armW, iTop, armW, armH, 'F');
  /* Right C — bottom arm */
  pdf.rect(iX + iW - pw - armW, iTop + iH - armH, armW, armH, 'F');
}

/** Running header for pages 2+ */
function addRunningHeader(pdf, title, pageNum, totalPages, margin, pageW) {
  pdf.setDrawColor(G200[0], G200[1], G200[2]);
  pdf.setLineWidth(0.25);
  pdf.line(margin, 8, pageW - margin, 8);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(6.5);
  setTxt(pdf, NAVY);
  pdf.text('CHAPEL HILL DENHAM', margin, 5.2);

  pdf.setFont('Helvetica', 'normal');
  setTxt(pdf, G500);
  const shortTitle = cleanPdfText(title).length > 58 ? cleanPdfText(title).substring(0, 58) + '…' : cleanPdfText(title);
  pdf.text(shortTitle, margin + 41, 5.2);

  setTxt(pdf, G500);
  pdf.text(`${pageNum} / ${totalPages}`, pageW - margin, 5.2, { align: 'right' });
}

/** Page footer */
function addFooter(pdf, pageNum, totalPages, margin, pageW, pageH) {
  const fy = pageH - 12;
  setDraw(pdf, G200);
  pdf.setLineWidth(0.2);
  pdf.line(margin, fy, pageW - margin, fy);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6);
  setTxt(pdf, G500);
  const disc =
    'This report is prepared by Chapel Hill Denham for informational purposes only and does not constitute investment advice. ' +
    'Past performance is not a reliable indicator of future results. ' +
    'Chapel Hill Denham is regulated by the Securities and Exchange Commission of Nigeria.';
  const dLines = pdf.splitTextToSize(disc, pageW - margin * 2 - 22);
  pdf.text(dLines, margin, fy + 4);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7);
  setTxt(pdf, G500);
  pdf.text(`${pageNum} / ${totalPages}`, pageW - margin, fy + 4, { align: 'right' });
}

/**
 * Generate a professional CHD-branded research report PDF.
 * @param {Object} report – { title, ex, body, date, category, access, analyst_name }
 */
export async function generateReportPDF(report) {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW  = pdf.internal.pageSize.getWidth();   // 210
    const pageH  = pdf.internal.pageSize.getHeight();  // 297
    const margin = 22;
    const colW   = pageW - margin * 2;   // 166 mm usable
    const safeW  = colW - 3;             // 3 mm buffer against measurement drift

    const reportDate  = cleanPdfText(report.date || new Date().toISOString().split('T')[0]);
    const analystName = cleanPdfText(report.analyst_name || 'Research Team');
    const category    = report.cat  || report.category || 'research';
    const catLabel    = CAT_LABELS[category]  || 'Research';
    const catColor    = CAT_COLORS[category]  || G700;
    const reportAccess = report.access === 'inherit' || !report.access
      ? (CATEGORY_ACCESS[category] || 'free')
      : report.access;

    /* Try loading actual logo */
    const logoBase64 = await loadLogoBase64();

    /* ─────────────────────────────────────────────
       PAGE 1 HEADER
    ───────────────────────────────────────────── */

    /* Header area — white background */
    let hdrH = 26;

    /* Logo */
    const logoSize = 11; // mm
    const logoX    = margin;
    const logoY    = 5;

    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize * 1.2);
      } catch {
        drawCHDShield(pdf, logoX + logoSize / 2, logoY + logoSize * 0.6, logoSize / 2);
      }
    } else {
      drawCHDShield(pdf, logoX + logoSize / 2, logoY + logoSize * 0.6, logoSize / 2);
    }

    /* Firm name */
    const textX = logoX + logoSize + 4;
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(10.5);
    setTxt(pdf, NAVY);
    pdf.text('CHAPEL HILL DENHAM', textX, logoY + 5);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.5);
    setTxt(pdf, G500);
    pdf.text('Independent Research', textX, logoY + 10.5);

    /* Date top-right */
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.5);
    setTxt(pdf, G500);
    pdf.text(reportDate, pageW - margin, logoY + 5, { align: 'right' });

    let y = hdrH + 10;

    /* ─────────────────────────────────────────────
       TITLE BLOCK
    ───────────────────────────────────────────── */

    /* Category + access pills */
    const pillY = y;
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(6.5);

    /* Category pill */
    const catTxt   = catLabel.toUpperCase();
    const catTxtW  = pdf.getTextWidth(catTxt) + 8;
    setFill(pdf, WHITE);
    setDraw(pdf, catColor);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(margin, pillY - 3.5, catTxtW, 5.5, 1, 1, 'FD');
    setTxt(pdf, catColor);
    pdf.text(catTxt, margin + catTxtW / 2, pillY, { align: 'center' });

    /* Access pill */
    const accTxt   = (reportAccess === 'free' ? 'FREE' : reportAccess === 'premium' ? 'PREMIUM' : 'REGISTERED');
    const accTxtW  = pdf.getTextWidth(accTxt) + 8;
    setFill(pdf, WHITE);
    setDraw(pdf, G300);
    pdf.roundedRect(margin + catTxtW + 4, pillY - 3.5, accTxtW, 5.5, 1, 1, 'FD');
    setTxt(pdf, G500);
    pdf.text(accTxt, margin + catTxtW + 4 + accTxtW / 2, pillY, { align: 'center' });

    y += 9;

    /* Report title */
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(17);
    setTxt(pdf, NAVY);
    const titleLines = pdf.splitTextToSize(cleanPdfText(report.title), colW - 2);
    for (const line of titleLines) {
      pdf.text(line, margin, y);
      y += 8.1;
    }

    y += 5;

    /* Analyst/date strip */
    const metaH = 11;
    setFill(pdf, [248,250,252]);
    setDraw(pdf, G200);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(margin, y, colW, metaH, 2, 2, 'FD');
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8.2);
    setTxt(pdf, G500);
    pdf.text(analystName, margin + 6, y + 7.1);
    setTxt(pdf, GOLD_L);
    pdf.text('•', pageW / 2, y + 7.1, { align: 'center' });
    setTxt(pdf, G500);
    pdf.text(reportDate, pageW - margin - 6, y + 7.1, { align: 'right' });
    y += metaH + 12;

    /* ─────────────────────────────────────────────
       EXECUTIVE SUMMARY
    ───────────────────────────────────────────── */
    if (report.ex) {
      const exW     = safeW - 12;
      const exLines = pdf.splitTextToSize(cleanPdfText(report.ex), exW);
      const boxH    = exLines.length * 4.7 + 15;

      /* Box */
      setFill(pdf, [248,250,252]);
      setDraw(pdf, G200);
      pdf.setLineWidth(0.28);
      pdf.roundedRect(margin, y, colW, boxH, 2, 2, 'FD');

      /* Left gold bar */
      setFill(pdf, GOLD);
      pdf.roundedRect(margin, y, 2.2, boxH, 1, 1, 'F');

      /* Label */
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(6.2);
      setTxt(pdf, GOLD);
      pdf.text('EXECUTIVE SUMMARY', margin + 7, y + 6.1);

      /* Text — clean left alignment */
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9.1);
      setTxt(pdf, G700);
      let ey = y + 12.3;
      const exTxtX = margin + 7;
      exLines.forEach(line => {
        pdf.text(line, exTxtX, ey);
        ey += 4.7;
      });

      y += boxH + 14;
    }

    /* ─────────────────────────────────────────────
       BODY CONTENT
    ───────────────────────────────────────────── */
    if (report.body) {
      const paragraphs = cleanPdfText(report.body).split(/\n\n+/);
      const lineH  = 5.6;   // line height mm
      const paraGap = 5.2;  // gap between paragraphs mm

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9.5);
      setTxt(pdf, G700);

      for (const para of paragraphs) {
        const cleaned = para.replace(/\n/g, ' ').trim();
        if (!cleaned) continue;
        const pLines = pdf.splitTextToSize(cleaned, safeW);

        /* Check if entire paragraph fits; if not, start on new page */
        if (y + pLines.length * lineH > pageH - 22) {
          addFooter(pdf, pdf.getCurrentPageInfo().pageNumber, '?', margin, pageW, pageH);
          pdf.addPage();
          addRunningHeader(pdf, report.title, pdf.getCurrentPageInfo().pageNumber, '?', margin, pageW);
          y = 19;
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9.5);
          setTxt(pdf, G700);
        }

        for (let li = 0; li < pLines.length; li++) {
          if (y > pageH - 22) {
            addFooter(pdf, pdf.getCurrentPageInfo().pageNumber, '?', margin, pageW, pageH);
            pdf.addPage();
            addRunningHeader(pdf, report.title, pdf.getCurrentPageInfo().pageNumber, '?', margin, pageW);
            y = 19;
            pdf.setFont('Helvetica', 'normal');
            pdf.setFontSize(9.5);
            setTxt(pdf, G700);
          }
          pdf.text(pLines[li], margin, y);
          y += lineH;
        }

        y += paraGap;
      }
    }

    /* ─────────────────────────────────────────────
       PATCH PAGE NUMBERS AND FOOTERS
    ───────────────────────────────────────────── */
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      if (i > 1) addRunningHeader(pdf, report.title, i, total, margin, pageW);
      addFooter(pdf, i, total, margin, pageW, pageH);
    }

    /* ─────────────────────────────────────────────
       SAVE
    ───────────────────────────────────────────── */
    const safeTitle = report.title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50).trim();
    pdf.save(`${safeTitle} – ${analystName} – ${reportDate}.pdf`);

  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Could not generate PDF. Please try again.');
  }
}

/** @deprecated */
export async function imageToBase64() { return null; }
