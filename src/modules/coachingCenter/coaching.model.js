const mongoose = require("mongoose");

/**
 * Coaching Center (Tenant) Schema
 */
const coachingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      trim: true,
      index: true,
    },

    email: { type: String, required: true, trim: true, lowercase: true },

    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    /**
     * LEGACY (compat only)
     */
    subscriptionStatus: {
      type: String,
      enum: ["trial", "paid", "active", "expired", "suspended", "deactivated"],
      default: "trial",
      index: true,
    },

    joinedAt: { type: Date, default: Date.now },

    /**
     * LEGACY TRIAL (compat only)
     * Mirror of subscription.trialStart/trialEnd
     */
    trialStartDate: { type: Date, default: Date.now },
    trialExpiryDate: { type: Date, required: true, index: true },

    /**
     * LEGACY (UI warning only)
     */
    paymentProcessed: { type: Boolean, default: true },

    /**
     * ✅ NEW SUBSCRIPTION ENGINE
     */
    subscription: {
      plan: {
        type: String,
        enum: ["yearly"], // keep clean; trial is a phase, not a plan
        default: "yearly",
        index: true,
      },

      status: {
        type: String,
        enum: [
          "trial_active",
          "payment_pending",
          "active",
          "trial_expired",
          "expired",
          "suspended",
        ],
        default: "trial_active",
        index: true,
      },

      trialStart: { type: Date, default: Date.now },
      trialEnd: { type: Date, index: true },

      startAt: { type: Date, default: null, index: true },
      endAt: { type: Date, default: null, index: true },

      lastPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPayment",
        default: null,
      },
    },

    settings: {
      logoUrl: { type: String },
      address: { type: String },
      contactNumber: { type: String },
      currency: { type: String, default: "BDT" },
      classes: [{ type: String }],
      batches: [{ type: String }],
    },
  },
  { timestamps: true },
);

/**
 * Helpers
 */
function normalizeSlug(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function plusDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Pre-validate:
 * - ensure slug
 * - ensure trialEnd
 * - mirror legacy trial dates
 * - validate subscription active needs startAt/endAt
 */
coachingSchema.pre("validate", function () {
  // slug
  if (this.name && !this.slug) this.slug = normalizeSlug(this.name);

  // ensure subscription object exists
  if (!this.subscription) this.subscription = {};

  // trial start defaults
  if (!this.subscription.trialStart) {
    this.subscription.trialStart = this.trialStartDate || new Date();
  }

  // trial end defaults (14d)
  if (!this.subscription.trialEnd) {
    this.subscription.trialEnd = plusDays(this.subscription.trialStart, 14);
  }

  // mirror legacy trial dates from subscription (single source of truth)
  this.trialStartDate = this.subscription.trialStart;
  this.trialExpiryDate = this.subscription.trialEnd;

  // conditional correctness: active must have startAt/endAt
  if (this.subscription.status === "active") {
    if (!this.subscription.startAt || !this.subscription.endAt) {
      this.invalidate(
        "subscription",
        "Active subscription requires startAt and endAt",
      );
    }
  }
});

/**
 * Pre-save:
 * Keep legacy subscriptionStatus synced (compat layer)
 * NOTE: findByIdAndUpdate bypasses this; update code must also sync.
 */
coachingSchema.pre("save", function () {
  const s = this.subscription?.status;

  if (s === "trial_active" || s === "payment_pending") {
    this.subscriptionStatus = "trial";
  } else if (s === "active") {
    this.subscriptionStatus = "paid";
  } else if (s === "trial_expired" || s === "expired") {
    this.subscriptionStatus = "expired";
  } else if (s === "suspended") {
    this.subscriptionStatus = "suspended";
  }
});

/**
 * Useful Indexes for enforcement
 */
coachingSchema.index({ "subscription.status": 1, "subscription.endAt": 1 });
coachingSchema.index({ "subscription.status": 1, "subscription.trialEnd": 1 });

module.exports = mongoose.model("CoachingCenter", coachingSchema);
