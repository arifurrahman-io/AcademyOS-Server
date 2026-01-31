const pdfService = require('./pdf.service');
const studentService = require('../students/student.service');
const paymentService = require('../payments/payment.service');

exports.downloadStudentReport = async (req, res) => {
  try {
    const students = await studentService.getStudentList(req.coaching_id);
    
    const headers = ['Name', 'Roll Number', 'Batch'];
    const rows = students.map(s => [s.name, s.roll_number, s.batch]);

    const doc = pdfService.generateTablePDF('Student List Report', headers, rows);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=students.pdf');
    doc.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.downloadDefaulterReport = async (req, res) => {
  try {
    const { month } = req.query;
    const defaulters = await paymentService.getDefaulters(req.coaching_id, month);

    const headers = ['Student Name', 'Roll No', 'Phone'];
    const rows = defaulters.map(d => [d.name, d.roll_number, d.phone || 'N/A']);

    const doc = pdfService.generateTablePDF(`Defaulter List - ${month}`, headers, rows);

    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};