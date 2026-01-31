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
    // Linked to the primary admin in the users collection
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "paid", "active", "expired", "suspended", "deactivated"], // Updated to include your status needs
      default: "trial", //
    },
    // Used to calculate "Days Remaining" in TrialStatus.jsx
    trialStartDate: {
      type: Date,
      default: Date.now, //
    },
    // Super-Admin Control: Warning logic for unprocessed payments
    paymentProcessed: {
      type: Boolean,
      default: true,
    },
    settings: {
      logoUrl: { type: String },
      address: { type: String },
      contactNumber: { type: String },
      currency: {
        type: String,
        default: "BDT", //
      },
      // Registry Data Persistence
      classes: [{ type: String }],
      batches: [{ type: String }],
    },
  },
  {
    timestamps: true, // Automatically handles createdAt and updatedAt
  },
);

// Middleware to automatically generate a slug from the name if not provided
coachingSchema.pre("save", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().split(" ").join("-");
  }
  next();
});

module.exports = mongoose.model("CoachingCenter", coachingSchema);
