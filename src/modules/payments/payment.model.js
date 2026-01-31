const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  coaching_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CoachingCenter', 
    required: true 
  },
  student_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: [true, 'Please specify the amount collected'],
    min: [0, 'Amount cannot be negative']
  },
  month: { 
    type: String, 
    required: true,
    // matches "January-2026" format
    match: [/^[A-Z][a-z]+-\d{4}$/, 'Please provide month in "Month-Year" format']
  }, 
  paymentDate: { 
    type: Date, 
    default: Date.now 
  },
  method: { 
    type: String, 
    enum: ['Cash', 'bKash', 'Nagad', 'Card'], // Added Nagad for consistency
    default: 'Cash' 
  },
  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true // Only required for digital payments
  },
  collectedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  remarks: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- INDEXES ---
// Prevent duplicate payments for the same student in the same month
paymentSchema.index({ student_id: 1, month: 1 }, { unique: true });
// Optimized for Dashboard Revenue queries
paymentSchema.index({ coaching_id: 1, createdAt: -1 });

// --- STATICS ---
/**
 * Calculates total revenue for the current month for a specific coaching node
 * Powers the "Actual Revenue" card on the dashboard
 */
paymentSchema.statics.getMonthlyStats = async function(coachingId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return await this.aggregate([
    { $match: { 
        coaching_id: coachingId, 
        createdAt: { $gte: startOfMonth } 
    }},
    { $group: { 
        _id: '$coaching_id', 
        totalCollected: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
    }}
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);