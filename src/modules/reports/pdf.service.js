const PDFDocument = require("pdfkit");

/**
 * Modern Table PDF Generator
 * - Clean header + divider
 * - Metadata line (generated date)
 * - Zebra table rows
 * - Auto page break
 * - Footer (page number)
 *
 * NOTE:
 * Do NOT call doc.end() here. Controller should end it after piping.
 */
exports.generateTablePDF = (title, headers, rows, options = {}) => {
  const {
    subtitle = "",
    meta = {}, // { instituteName, month, generatedBy }
    theme = {
      accent: "#2563EB", // blue-600
      text: "#0F172A", // slate-900
      muted: "#64748B", // slate-500
      border: "#E2E8F0", // slate-200
      zebra: "#F8FAFC", // slate-50
    },
  } = options;

  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: {
      Title: title,
      Author: "AcademyOS",
    },
  });

  // ---- Layout Constants ----
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = doc.page.margins.left;
  const usableWidth =
    pageWidth - doc.page.margins.left - doc.page.margins.right;

  const headerHeight = 78;
  const footerHeight = 40;
  const tableTopSpacing = 14;

  // Column sizing: distribute evenly by default
  const colCount = Math.max(headers?.length || 0, 1);
  const colGap = 10;
  const colWidth = (usableWidth - colGap * (colCount - 1)) / colCount;

  // Vertical state
  let y = doc.page.margins.top;

  // Track pages for footer
  let pageNumber = 1;

  // ---- Helpers ----
  const drawHeader = () => {
    const left = margin;
    const right = margin + usableWidth;

    // Brand + Title
    doc
      .fillColor(theme.accent)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("AcademyOS", left, y, { continued: false });

    doc
      .fillColor(theme.text)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(title, left, y + 18, { width: usableWidth });

    if (subtitle) {
      doc
        .fillColor(theme.muted)
        .font("Helvetica")
        .fontSize(10)
        .text(subtitle, left, y + 44, { width: usableWidth });
    }

    // Meta line (right aligned small)
    const metaPieces = [];
    if (meta?.instituteName)
      metaPieces.push(`Institute: ${meta.instituteName}`);
    if (meta?.month) metaPieces.push(`Month: ${meta.month}`);
    metaPieces.push(`Generated: ${new Date().toLocaleString()}`);
    if (meta?.generatedBy) metaPieces.push(`By: ${meta.generatedBy}`);

    doc
      .fillColor(theme.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(metaPieces.join("  •  "), left, y + 60, {
        width: usableWidth,
      });

    // Divider
    doc
      .moveTo(left, y + headerHeight)
      .lineTo(right, y + headerHeight)
      .lineWidth(1)
      .strokeColor(theme.border)
      .stroke();

    y = y + headerHeight + tableTopSpacing;
  };

  const drawFooter = () => {
    const left = margin;
    const bottomY = pageHeight - doc.page.margins.bottom - 12;

    // Divider
    doc
      .moveTo(left, bottomY - 12)
      .lineTo(left + usableWidth, bottomY - 12)
      .lineWidth(1)
      .strokeColor(theme.border)
      .stroke();

    doc
      .fillColor(theme.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Page ${pageNumber}`, left, bottomY - 6, {
        width: usableWidth,
        align: "right",
      });
  };

  const ensureSpace = (neededHeight = 20) => {
    const bottomLimit = pageHeight - doc.page.margins.bottom - footerHeight;
    if (y + neededHeight > bottomLimit) {
      drawFooter();
      doc.addPage();
      pageNumber += 1;
      y = doc.page.margins.top;
      drawHeader();
      drawTableHeader(); // repeat table header on new page
    }
  };

  const drawTableHeader = () => {
    ensureSpace(34);

    // Header background
    doc.save().rect(margin, y, usableWidth, 26).fill(theme.accent);

    // Header text
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);

    headers.forEach((h, i) => {
      const x = margin + i * (colWidth + colGap);
      doc.text(String(h ?? ""), x, y + 7, {
        width: colWidth,
        ellipsis: true,
      });
    });

    doc.restore();

    // Border under header
    doc
      .moveTo(margin, y + 26)
      .lineTo(margin + usableWidth, y + 26)
      .lineWidth(1)
      .strokeColor(theme.border)
      .stroke();

    y += 30;
  };

  const drawRow = (row, idx) => {
    // Estimate height for wrapping text (simple heuristic)
    const baseHeight = 20;
    const maxLinesGuess = 2; // keeps layout neat; long text will wrap, height expands slightly
    const rowHeight = baseHeight + (maxLinesGuess - 1) * 10;

    ensureSpace(rowHeight + 6);

    // Zebra background
    if (idx % 2 === 1) {
      doc
        .save()
        .rect(margin, y - 2, usableWidth, rowHeight)
        .fill(theme.zebra)
        .restore();
    }

    // Row text
    doc.fillColor(theme.text).font("Helvetica").fontSize(10);

    (row || []).forEach((cell, i) => {
      const x = margin + i * (colWidth + colGap);
      doc.text(cell == null ? "N/A" : String(cell), x, y, {
        width: colWidth,
        lineGap: 2,
      });
    });

    // Row divider
    doc
      .moveTo(margin, y + rowHeight)
      .lineTo(margin + usableWidth, y + rowHeight)
      .lineWidth(0.7)
      .strokeColor(theme.border)
      .stroke();

    y += rowHeight + 2;
  };

  // ---- Build PDF ----
  drawHeader();
  drawTableHeader();

  if (!Array.isArray(rows) || rows.length === 0) {
    ensureSpace(60);
    doc
      .fillColor(theme.muted)
      .font("Helvetica")
      .fontSize(11)
      .text("No data found for this report.", margin, y + 12, {
        width: usableWidth,
        align: "center",
      });
  } else {
    rows.forEach((r, idx) => drawRow(r, idx));
  }

  // Footer for last page
  drawFooter();

  return doc;
};
