const pdfService = require("./pdf.service");
const studentService = require("../students/student.service");
const paymentService = require("../payments/payment.service");

/**
 * Helpers
 */
const sanitizeFilename = (name = "report") =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isValidMonthYear = (value = "") =>
  /^[A-Z][a-z]+-\d{4}$/.test(String(value).trim()); // "January-2026"

/**
 * GET /api/v1/reports/students
 * Download Student List PDF
 */
exports.downloadStudentReport = async (req, res) => {
  try {
    if (!req.coaching_id) {
      return res.status(400).json({
        success: false,
        code: "COACHING_SCOPE_REQUIRED",
        message: "Missing coaching scope",
      });
    }

    const students = await studentService.getStudentList(req.coaching_id);

    // ✅ REQUIRED COLUMNS
    const headers = [
      "Sl.",
      "Student's Name",
      "Roll",
      "Class",
      "Batch",
      "Phone",
    ];

    const rows = (students || []).map((s, idx) => [
      idx + 1,
      s?.name || "N/A",
      s?.roll_number ?? s?.roll ?? "N/A",
      s?.class_level ?? s?.studentClass ?? s?.level ?? "N/A",
      s?.batch || "N/A",
      s?.phone || s?.contactNumber || "N/A",
    ]);

    const doc = pdfService.generateTablePDF(
      "Student List Report",
      headers,
      rows,
      {
        subtitle: "Exported from AcademyOS",
        meta: {
          instituteName: req.user?.name || "",
          generatedBy: req.user?.email || "",
        },
      },
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="students.pdf"`);

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("downloadStudentReport:", error);
    res.status(500).json({
      success: false,
      code: "PDF_GENERATION_FAILED",
      message: error.message,
    });
  }
};

/**
 * GET /api/v1/reports/defaulters?month=January-2026
 * Download Defaulter List PDF (month required)
 */
exports.downloadDefaulterReport = async (req, res) => {
  try {
    if (!req.coaching_id) {
      return res.status(400).json({
        success: false,
        code: "COACHING_SCOPE_REQUIRED",
        message: "Missing coaching scope",
      });
    }

    const month = String(req.query?.month || "").trim();
    if (!month) {
      return res.status(400).json({
        success: false,
        code: "MONTH_REQUIRED",
        message: `Query param "month" is required (e.g. January-2026)`,
      });
    }

    // Optional strict format validation (matches your Payment model regex)
    if (!isValidMonthYear(month)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_MONTH_FORMAT",
        message: `Invalid month format. Use "Month-Year" like January-2026`,
      });
    }

    const defaulters = await paymentService.getDefaulters(
      req.coaching_id,
      month,
    );

    const headers = [
      "Sl.",
      "Student's Name",
      "Roll",
      "Class",
      "Batch",
      "Phone",
    ];
    const rows = (defaulters || []).map((s, idx) => [
      idx + 1,
      s?.name || "N/A",
      s?.roll_number ?? s?.roll ?? "N/A",
      s?.class_level ?? s?.studentClass ?? s?.level ?? "N/A",
      s?.batch || "N/A",
      s?.phone || s?.contactNumber || "N/A",
    ]);

    const title = `Defaulter List - ${month}`;
    const doc = pdfService.generateTablePDF(title, headers, rows);

    const filename = `${sanitizeFilename(`defaulters-${month}`)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.end(); // ✅ important
  } catch (error) {
    console.error("downloadDefaulterReport:", error);
    return res.status(500).json({
      success: false,
      code: "PDF_GENERATION_FAILED",
      message: error.message || "Failed to generate PDF",
    });
  }
};
