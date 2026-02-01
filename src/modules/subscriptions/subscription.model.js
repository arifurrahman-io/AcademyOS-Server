const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    coaching_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachingCenter",
      required: true,
    },
    plan: {
      type: String,
      enum: ["trial", "basic", "premium", "yearly pro"],
      default: "trial",
    }, // Updated enum
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    amountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "active",
    }, // Added pending
    method: { type: String, enum: ["bKash", "Nagad", "Cash"], default: "Cash" }, // Added
    senderNumber: String, // Added
    transactionId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
