const mongoose = require("mongoose");
const CoachingCenter = require("../coachingCenter/coaching.model");
const SubscriptionPayment = require("./subscriptionPayment.model");

const YEARLY_PRICE = 1200;
const YEAR_DAYS = 365;
const TRIAL_DAYS = 14;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function computeTrialStatus(center) {
  const now = new Date();
  const trialEnd =
    center?.subscription?.trialEnd ||
    center?.trialExpiryDate ||
    addDays(center?.trialStartDate || center?.createdAt || now, TRIAL_DAYS);

  const diff = new Date(trialEnd) - now;
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return {
    trialEnd,
    daysRemaining: Math.max(0, daysRemaining),
    isTrialExpired: diff <= 0,
  };
}

/**
 * Coaching Admin submits payment proof (bkash/nagad trxId)
 * Sets center.subscription.status => payment_pending
 */
exports.submitPaymentProof = async ({ coachingId, userId, payload }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const center = await CoachingCenter.findById(coachingId).session(session);
    if (!center) throw new Error("Center not found");

    // Normalize provider
    const provider = String(payload.method || payload.provider || "")
      .trim()
      .toLowerCase();

    if (!["bkash", "nagad"].includes(provider)) {
      throw new Error("Invalid provider. Use bkash or nagad");
    }

    const amount = Number(payload.amount ?? YEARLY_PRICE);
    if (!amount || amount < 1) throw new Error("Invalid amount");

    const senderNumber = String(payload.senderNumber || "").trim();
    const trxId = String(payload.transactionId || payload.trxId || "").trim();

    if (!senderNumber) throw new Error("Sender number is required");
    if (!trxId) throw new Error("Transaction ID is required");

    // Prevent duplicate pending payment for same trxId
    const dup = await SubscriptionPayment.findOne({ trxId }).session(session);
    if (dup) throw new Error("This Transaction ID already submitted");

    const payment = await SubscriptionPayment.create(
      [
        {
          coaching_id: coachingId,
          provider,
          amount,
          senderNumber,
          trxId,
          status: "pending",
          submittedBy: userId,
        },
      ],
      { session },
    );

    // Ensure subscription object
    if (!center.subscription) center.subscription = {};

    // If trial expired or user renewing expired plan—still allow submit
    center.subscription.plan = "yearly";
    center.subscription.status = "payment_pending";
    center.subscription.lastPaymentId = payment[0]._id;

    // Keep legacy flags consistent (optional)
    center.paymentProcessed = false;

    await center.save({ session });

    await session.commitTransaction();
    return payment[0];
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

/**
 * Super-admin verifies or rejects payment
 * On verify: activates yearly for 365 days from now
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

    if (normalizedAction === "reject") {
      payment.status = "rejected";

      // Keep center locked (trial_expired or expired stays locked)
      if (!center.subscription) center.subscription = {};
      // If trial already ended => trial_expired, else keep payment_pending? better: trial_active/payment_pending -> trial_expired depends on trial
      const trial = computeTrialStatus(center);
      center.subscription.status = trial.isTrialExpired
        ? "trial_expired"
        : "trial_active";
      center.paymentProcessed = false;

      await payment.save({ session });
      await center.save({ session });

      await session.commitTransaction();
      return { payment, center };
    }

    // VERIFY
    payment.status = "verified";

    const startAt = new Date();
    const endAt = addDays(startAt, YEAR_DAYS);

    if (!center.subscription) center.subscription = {};
    center.subscription.plan = "yearly";
    center.subscription.status = "active";
    center.subscription.startAt = startAt;
    center.subscription.endAt = endAt;
    center.subscription.lastPaymentId = payment._id;

    // Legacy compatibility fields (your UI uses subscriptionStatus)
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
      "name slug email subscriptionStatus trialStartDate trialExpiryDate subscription paymentProcessed settings.createdAt createdAt",
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

  const now = new Date();

  return centers.map((c) => {
    const trial = computeTrialStatus(c);

    const sub = c.subscription || {};
    const endAt = sub.endAt ? new Date(sub.endAt) : null;
    const yearlyExpired = endAt ? endAt <= now : false;

    // Effective status (source of truth)
    let effectiveStatus = sub.status || "trial_active";
    if (effectiveStatus === "active" && yearlyExpired)
      effectiveStatus = "expired";

    const phone =
      c?.settings?.contactNumber || c?.settings?.phone || c?.phone || "N/A";

    return {
      _id: c._id,
      name: c.name,
      slug: c.slug,
      email: c.email,
      phone,
      paymentProcessed: c.paymentProcessed ?? true,

      // legacy
      subscriptionStatus: c.subscriptionStatus,

      // trial info
      trialEnd: trial.trialEnd,
      trialDaysRemaining: trial.daysRemaining,
      isTrialExpired: trial.isTrialExpired,

      // yearly info
      plan: sub.plan || "trial",
      status: effectiveStatus,
      startAt: sub.startAt || null,
      endAt: sub.endAt || null,

      latestPayment: payMap.get(String(c._id)) || null,
    };
  });
};

/**
 * Coaching admin can see own subscription state (optional)
 */
exports.getMyStatus = async (coachingId) => {
  const center = await CoachingCenter.findById(coachingId).lean();
  if (!center) throw new Error("Center not found");

  const trial = computeTrialStatus(center);
  const now = new Date();

  const sub = center.subscription || {};
  const endAt = sub.endAt ? new Date(sub.endAt) : null;
  const yearlyExpired = endAt ? endAt <= now : false;

  let effectiveStatus = sub.status || "trial_active";
  if (effectiveStatus === "active" && yearlyExpired)
    effectiveStatus = "expired";

  return {
    coaching_id: center._id,
    plan: sub.plan || "trial",
    status: effectiveStatus,
    trialEnd: trial.trialEnd,
    trialDaysRemaining: trial.daysRemaining,
    startAt: sub.startAt || null,
    endAt: sub.endAt || null,
  };
};

exports.listPayments = async (query = {}) => {
  const status = String(query.status || "")
    .trim()
    .toLowerCase(); // pending/verified/rejected
  const q = String(query.q || "").trim();
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const filter = {};
  if (["pending", "verified", "rejected"].includes(status)) {
    filter.status = status;
  }

  // Search: trxId / senderNumber
  if (q) {
    filter.$or = [
      { trxId: { $regex: q, $options: "i" } },
      { senderNumber: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    SubscriptionPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // Populate coaching center basic info for super-admin table
      .populate(
        "coaching_id",
        "name slug email subscriptionStatus subscription settings.contactNumber",
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
