const paymentService = require('./payment.service');
const Payment = require('./payment.model');

/**
 * @desc    Collect Tuition or Admission Fee
 * @route   POST /api/v1/payments/collect
 */
exports.collectFee = async (req, res) => {
  try {
    const payment = await paymentService.recordPayment(
      req.body, 
      req.coaching_id, 
      req.user._id
    );

    res.status(201).json({ 
      success: true, 
      message: "Transaction authorized and recorded",
      data: payment 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message || "Payment processing failed" 
    });
  }
};

/**
 * @desc    Identify students who haven't paid for a specific month
 * @route   GET /api/v1/payments/defaulters
 */
exports.getDefaulterList = async (req, res) => {
  try {
    const { month } = req.query; // e.g., ?month=January-2026
    
    if (!month) {
      return res.status(400).json({ 
        success: false, 
        message: "Please specify the billing period (e.g., January-2026)" 
      });
    }

    const defaulters = await paymentService.getDefaulters(req.coaching_id, month);

    res.status(200).json({ 
      success: true, 
      count: defaulters.length, 
      data: defaulters 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating defaulter list: " + error.message 
    });
  }
};

/**
 * @desc    Fetch all payment logs for the current institute node
 * @route   GET /api/v1/payments/history
 * FIX: Added deep population to ensure frontend search/filters work
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ coaching_id: req.coaching_id })
      .populate('student_id', 'name roll_number batch class_level monthly_fee') 
      .populate('collectedBy', 'name') // Matches the field name in your MongoDB screenshot
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching payment history: " + error.message
    });
  }
};

/**
 * @desc    Fetch specific ledger for a single student profile
 * @route   GET /api/v1/payments/student/:id
 * FIX: Added population to show student context in the ledger view
 */
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    const history = await Payment.find({ 
      student_id: req.params.id, 
      coaching_id: req.coaching_id 
    })
    .populate('student_id', 'name roll_number')
    .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: history.length,
      data: history 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching student ledger: " + error.message 
    });
  }
};