const mongoose = require("mongoose");

/**
 * @desc    Coaching Center (Tenant) Schema
 * Defines the core operational node for each institute.
 */
const coachingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
    },
    // The official email for the coaching center
    email: {
      type: String,
      required: true,
    },
    // Linked to the primary admin in the users collection
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "paid", "active", "expired", "suspended", "deactivated"],
      default: "trial",
    },
    // Explicit Join Date (fallback for createdAt)
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    // Used to calculate "Days Remaining"
    trialStartDate: {
      type: Date,
      default: Date.now,
    },
    // Explicit Trial Expiry Date (e.g., trialStartDate + 14 days)
    trialExpiryDate: {
      type: Date,
      required: true,
    },
    // Super-Admin Control: Warning logic for unprocessed payments
    paymentProcessed: {
      type: Boolean,
      default: true,
    },
    settings: {
      logoUrl: { type: String },
      address: { type: String },
      contactNumber: { type: String }, // Used as the primary phone
      currency: {
        type: String,
        default: "BDT",
      },
      // Registry Data Persistence
      classes: [{ type: String }],
      batches: [{ type: String }],
    },
  },
  {
    timestamps: true, // Handles createdAt and updatedAt
  },
);

/**
 * Pre-save middleware:
 * 1. Generates slug from name.
 * 2. Automatically sets trialExpiryDate to 14 days after trialStartDate if not set.
 */
coachingSchema.pre("validate", async function () {
  // Generate Slug
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
  }

  // Set default Trial Expiry (14 days) if not provided
  if (!this.trialExpiryDate && this.trialStartDate) {
    const expiry = new Date(this.trialStartDate);
    expiry.setDate(expiry.getDate() + 14);
    this.trialExpiryDate = expiry;
  }

  // No need to call next() here
});

module.exports = mongoose.model("CoachingCenter", coachingSchema);
