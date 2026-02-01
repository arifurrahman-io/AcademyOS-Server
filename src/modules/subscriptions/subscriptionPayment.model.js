const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    coaching_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachingCenter",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["bkash", "nagad"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 1200,
    },

    senderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    trxId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: { type: Date },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

subscriptionPaymentSchema.index({ coaching_id: 1, createdAt: -1 });

module.exports = mongoose.model(
  "SubscriptionPayment",
  subscriptionPaymentSchema,
);
