const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  coaching_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CoachingCenter', 
    required: true 
  },
  plan: { type: String, enum: ['trial', 'basic', 'premium'], default: 'trial' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
  transactionId: String // For future Stripe/SSLCommerz integration
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);