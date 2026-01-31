const PDFDocument = require('pdfkit');

exports.generateTablePDF = (title, headers, rows) => {
  const doc = new PDFDocument({ margin: 30 });
  
  // Header: Title
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();

  // Simple Table Logic (Draws headers and rows)
  const startX = 50;
  let currentY = doc.y;

  // Draw Headers
  doc.fontSize(12).fillColor('blue');
  headers.forEach((header, i) => {
    doc.text(header, startX + i * 150, currentY);
  });

  // Draw Line
  doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
  currentY = doc.y + 15;

  // Draw Rows
  doc.fillColor('black');
  rows.forEach(row => {
    row.forEach((cell, i) => {
      doc.text(cell.toString(), startX + i * 150, currentY);
    });
    currentY += 20;
  });

  doc.end();
  return doc;
};