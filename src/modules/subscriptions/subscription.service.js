const mongoose = require("mongoose");
const CoachingCenter = require("../coachingCenter/coaching.model");
const SubscriptionPayment = require("./subscriptionPayment.model");

const YEARLY_PRICE = 1200;
const YEAR_DAYS = 365;
const TRIAL_DAYS = 14;

// Banner threshold
const EXPIRING_SOON_DAYS = 15;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function daysBetween(future, now = new Date()) {
  if (!isValidDate(future)) return 0;
  const ms = future.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Remove accidental quotes/spaces and keep only digits/+ if needed.
 * Fixes cases like "\"017222...\""
 */
function sanitizePhone(value) {
  if (value == null) return "";
  let s = String(value).trim();

  // remove wrapping quotes if present
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  // remove any embedded quotes
  s = s.replace(/["']/g, "").trim();

  // allow digits and + only
  s = s.replace(/[^\d+]/g, "");

  return s;
}

function normalizeProvider(payload) {
  return String(payload?.method || payload?.provider || "")
    .trim()
    .toLowerCase();
}

function normalizeTrxId(payload) {
  const raw = payload?.transactionId || payload?.trxId || "";
  return String(raw).trim();
}

/**
 * Trial status from coaching node fields (supports multiple historical field names)
 */
function computeTrialStatus(center) {
  const now = new Date();

  const trialStart =
    center?.trialStartDate ||
    center?.subscription?.trialStart ||
    center?.subscription?.trialStartDate ||
    center?.createdAt ||
    now;

  const trialEndRaw =
    center?.subscription?.trialEnd ||
    center?.trialExpiryDate ||
    center?.trialEnd ||
    addDays(trialStart, TRIAL_DAYS);

  const trialEnd = new Date(trialEndRaw);
  const diff = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  return {
    trialStart: new Date(trialStart),
    trialEnd,
    daysRemaining,
    isTrialExpired: diff <= 0,
    isTrialActive: diff > 0,
  };
}

/**
 * ✅ SINGLE SOURCE OF TRUTH for frontend.
 *
 * Returns:
 * - trial
 * - trial_expired
 * - pending
 * - declined
 * - active
 * - expired
 */
function computeEffectiveStatus(center, latestPayment = null) {
  const now = new Date();
  const sub = center?.subscription || {};

  const rawSubStatus = String(sub.status || "")
    .trim()
    .toLowerCase();
  const startAt = sub.startAt ? new Date(sub.startAt) : null;
  const endAt = sub.endAt ? new Date(sub.endAt) : null;

  const hasActiveWindow = isValidDate(endAt) && endAt > now;
  const hasExpiredWindow = isValidDate(endAt) && endAt <= now;

  // 1) ACTIVE overrides everything
  if (hasActiveWindow) {
    const daysRemaining = daysBetween(endAt, now);
    return {
      effectiveStatus: "active",
      daysRemaining,
      expiringSoon: daysRemaining <= EXPIRING_SOON_DAYS,
      startAt,
      endAt,
    };
  }

  // 2) Subscription says pending
  if (rawSubStatus === "payment_pending" || rawSubStatus === "pending") {
    return {
      effectiveStatus: "pending",
      daysRemaining: 0,
      expiringSoon: false,
      startAt: null,
      endAt: null,
    };
  }

  // 3) Expired subscription (was active before)
  if (rawSubStatus === "active" && hasExpiredWindow) {
    return {
      effectiveStatus: "expired",
      daysRemaining: 0,
      expiringSoon: false,
      startAt,
      endAt,
    };
  }

  // 4) explicit expired
  if (rawSubStatus === "expired") {
    return {
      effectiveStatus: "expired",
      daysRemaining: 0,
      expiringSoon: false,
      startAt,
      endAt,
    };
  }

  // 5) If last payment rejected and no active subscription -> declined
  if (
    latestPayment &&
    String(latestPayment.status).toLowerCase() === "rejected"
  ) {
    return {
      effectiveStatus: "declined",
      daysRemaining: 0,
      expiringSoon: false,
      startAt: null,
      endAt: null,
    };
  }

  // 6) trial status
  const trial = computeTrialStatus(center);
  if (trial.isTrialActive) {
    return {
      effectiveStatus: "trial",
      daysRemaining: trial.daysRemaining,
      expiringSoon: false,
      startAt: null,
      endAt: null,
    };
  }

  // 7) trial expired lock
  return {
    effectiveStatus: "trial_expired",
    daysRemaining: 0,
    expiringSoon: false,
    startAt: null,
    endAt: null,
  };
}

/**
 * Coaching Admin submits payment proof (bkash/nagad trxId)
 * - creates SubscriptionPayment: pending
 * - marks center.subscription.status: payment_pending
 */
exports.submitPaymentProof = async ({ coachingId, userId, payload }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const center = await CoachingCenter.findById(coachingId).session(session);
    if (!center) throw new Error("Center not found");

    const provider = normalizeProvider(payload);
    if (!["bkash", "nagad"].includes(provider)) {
      throw new Error("Invalid provider. Use bkash or nagad");
    }

    const amount = Number(payload?.amount ?? YEARLY_PRICE);
    if (!Number.isFinite(amount) || amount < 1)
      throw new Error("Invalid amount");

    const senderNumber = sanitizePhone(payload?.senderNumber);
    const trxId = normalizeTrxId(payload);
    if (!senderNumber) throw new Error("Sender number is required");
    if (!trxId) throw new Error("Transaction ID is required");

    const trxIdKey = trxId.toUpperCase();

    // Prevent duplicate trxId submissions
    const dup = await SubscriptionPayment.findOne({ trxId: trxIdKey }).session(
      session,
    );
    if (dup) throw new Error("This Transaction ID already submitted");

    const paymentDocs = await SubscriptionPayment.create(
      [
        {
          coaching_id: coachingId,
          provider,
          amount,
          senderNumber,
          trxId: trxIdKey,
          status: "pending",
          submittedBy: userId,
        },
      ],
      { session },
    );
    const payment = paymentDocs[0];

    // Ensure subscription object
    if (!center.subscription) center.subscription = {};

    // Keep plan
    center.subscription.plan = "yearly";

    // ✅ Mark pending in subscription for UI
    center.subscription.status = "payment_pending";
    center.subscription.lastPaymentId = payment._id;

    // legacy compatibility
    center.paymentProcessed = false;

    await center.save({ session });

    await session.commitTransaction();
    return payment;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

/**
 * Super-admin verifies or rejects payment
 * - verify => active + startAt/endAt for 365 days
 * - reject => DOES NOT downgrade if existing subscription is still active
 */
exports.verifyPayment = async ({ paymentId, action, superAdminId, note }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment =
      await SubscriptionPayment.findById(paymentId).session(session);
    if (!payment) throw new Error("Payment not found");

    if (payment.status !== "pending") {
      throw new Error(`Payment already ${payment.status}`);
    }

    const center = await CoachingCenter.findById(payment.coaching_id).session(
      session,
    );
    if (!center) throw new Error("Center not found");

    const normalizedAction = String(action || "")
      .trim()
      .toLowerCase();
    if (!["verify", "reject"].includes(normalizedAction)) {
      throw new Error("Invalid action. Use verify or reject");
    }

    payment.verifiedBy = superAdminId;
    payment.verifiedAt = new Date();
    payment.note = note ? String(note).trim() : "";

    if (!center.subscription) center.subscription = {};
    const now = new Date();
    const currentEndAt = center.subscription.endAt
      ? new Date(center.subscription.endAt)
      : null;
    const currentlyActive = isValidDate(currentEndAt) && currentEndAt > now;

    if (normalizedAction === "reject") {
      payment.status = "rejected";

      // ✅ If center already has an active license, KEEP IT
      if (currentlyActive) {
        center.subscription.status = "active";
        center.paymentProcessed = true;
        center.subscriptionStatus = "paid";
      } else {
        // Otherwise revert to trial (active/expired based on real trial end)
        const trial = computeTrialStatus(center);
        center.subscription.status = trial.isTrialExpired
          ? "trial_expired"
          : "trial_active";
        center.paymentProcessed = false;

        // Optional: reflect legacy subscriptionStatus too
        center.subscriptionStatus = trial.isTrialExpired ? "expired" : "trial";
      }

      await payment.save({ session });
      await center.save({ session });

      await session.commitTransaction();
      return { payment, center };
    }

    // VERIFY
    payment.status = "verified";

    const startAt = new Date();
    const endAt = addDays(startAt, YEAR_DAYS);

    center.subscription.plan = "yearly";
    center.subscription.status = "active";
    center.subscription.startAt = startAt;
    center.subscription.endAt = endAt;
    center.subscription.lastPaymentId = payment._id;

    // legacy compatibility (your UI checks these)
    center.subscriptionStatus = "paid";
    center.paymentProcessed = true;

    await payment.save({ session });
    await center.save({ session });

    await session.commitTransaction();
    return { payment, center };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

/**
 * Super-admin monitor panel
 * Returns centers + latest payment + computed trial/yearly health
 */
exports.getMonitorAll = async () => {
  const centers = await CoachingCenter.find({})
    .select(
      "name slug email subscriptionStatus trialStartDate trialExpiryDate subscription paymentProcessed settings createdAt",
    )
    .sort({ createdAt: -1 })
    .lean();

  const centerIds = centers.map((c) => c._id);

  const latestPayments = await SubscriptionPayment.aggregate([
    { $match: { coaching_id: { $in: centerIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$coaching_id",
        latest: { $first: "$$ROOT" },
      },
    },
  ]);

  const payMap = new Map(latestPayments.map((p) => [String(p._id), p.latest]));

  return centers.map((c) => {
    const latestPayment = payMap.get(String(c._id)) || null;
    const trial = computeTrialStatus(c);
    const eff = computeEffectiveStatus(c, latestPayment);

    const phone =
      c?.settings?.contactNumber || c?.settings?.phone || c?.phone || "N/A";

    return {
      _id: c._id,
      name: c.name,
      slug: c.slug,
      email: c.email,
      phone,

      paymentProcessed: c.paymentProcessed ?? true,
      subscriptionStatus: c.subscriptionStatus, // legacy

      // trial info
      trialEnd: trial.trialEnd,
      trialDaysRemaining: trial.daysRemaining,
      isTrialExpired: trial.isTrialExpired,

      // yearly info (UI truth)
      plan: c?.subscription?.plan || "trial",
      status: eff.effectiveStatus,
      startAt: eff.startAt || c?.subscription?.startAt || null,
      endAt: eff.endAt || c?.subscription?.endAt || null,
      subscriptionDaysRemaining: eff.daysRemaining || 0,
      expiringSoon: eff.expiringSoon || false,

      latestPayment,
    };
  });
};

/**
 * Coaching admin can see own subscription state
 * ✅ This is the API your frontend should use for dynamic UpgradePlan
 */
exports.getMyStatus = async (coachingId) => {
  const center = await CoachingCenter.findById(coachingId)
    .select(
      "subscription subscriptionStatus trialStartDate trialExpiryDate createdAt",
    )
    .lean();

  if (!center) throw new Error("Center not found");

  // latest payment (optional but needed for declined state)
  let latestPayment = null;
  if (center?.subscription?.lastPaymentId) {
    latestPayment = await SubscriptionPayment.findById(
      center.subscription.lastPaymentId,
    ).lean();
  } else {
    // fallback: find latest by coaching_id
    latestPayment = await SubscriptionPayment.findOne({
      coaching_id: coachingId,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  const trial = computeTrialStatus(center);
  const eff = computeEffectiveStatus(center, latestPayment);
  const sub = center.subscription || {};

  return {
    coaching_id: center._id,

    plan: sub.plan || "trial",

    // ✅ Frontend uses this
    status: eff.effectiveStatus,

    // trial
    trialEnd: trial.trialEnd,
    trialDaysRemaining: trial.daysRemaining,

    // subscription (only meaningful if active/expired)
    startAt: sub.startAt || null,
    endAt: sub.endAt || null,

    // ✅ for banner + UI
    subscriptionDaysRemaining: eff.daysRemaining || 0,
    expiringSoon: eff.expiringSoon || false,

    // optional: show last payment state in UI if you want
    latestPayment: latestPayment
      ? {
          _id: latestPayment._id,
          status: latestPayment.status,
          provider: latestPayment.provider,
          senderNumber: latestPayment.senderNumber,
          trxId: latestPayment.trxId,
          amount: latestPayment.amount,
          createdAt: latestPayment.createdAt,
          verifiedAt: latestPayment.verifiedAt,
          note: latestPayment.note,
        }
      : null,
  };
};

/**
 * Super-admin list payments (with search + pagination)
 */
exports.listPayments = async (query = {}) => {
  const status = String(query.status || "")
    .trim()
    .toLowerCase();
  const q = String(query.q || "").trim();
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const filter = {};

  if (["pending", "verified", "rejected"].includes(status)) {
    filter.status = status;
  }

  if (q) {
    filter.$or = [
      { trxId: { $regex: q, $options: "i" } },
      { senderNumber: { $regex: q, $options: "i" } },
      { provider: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    SubscriptionPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(
        "coaching_id",
        "name slug email subscriptionStatus subscription settings.contactNumber settings.phone",
      )
      .populate("submittedBy", "name email role")
      .populate("verifiedBy", "name email role")
      .lean(),
    SubscriptionPayment.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
