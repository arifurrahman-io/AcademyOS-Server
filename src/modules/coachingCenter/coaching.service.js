const Coaching = require("./coaching.model");
const User = require("../users/user.model");
const mongoose = require("mongoose");

/**
 * @desc    Registers a new coaching center and initializes the admin account
 * @param   {Object} data - incoming payload from controller
 */
exports.createCenter = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check if slug is taken
    const existing = await Coaching.findOne({ slug: data.slug });
    if (existing) throw new Error("Subdomain/Slug already in use");

    // 2. Identification Logic: Map 'adminEmail' from payload to 'email' field
    const centerEmail = data.adminEmail || data.email;
    if (!centerEmail)
      throw new Error("Email is required for node provisioning");

    // 3. Explicit Trial Calculation: Ensures "Trial Health" is not 0D
    const trialStart = data.trialStartDate || new Date();
    const trialExpiry = new Date(trialStart);
    trialExpiry.setDate(trialExpiry.getDate() + 14); // Standard 14-day trial period

    // 4. Initialize the Coaching Center node
    const coachingArray = await Coaching.create(
      [
        {
          name: data.name,
          slug: data.slug,
          email: centerEmail,
          subscriptionStatus: data.subscriptionStatus || "trial",
          paymentProcessed: data.paymentProcessed ?? true, // Fixes "Billing Warning"
          trialStartDate: trialStart,
          trialExpiryDate: trialExpiry, // Explicitly set to fix "0D" health bar
          joinedAt: new Date(),
          settings: {
            contactNumber: data.phone || data.contactNumber || "", // Fixes "N/A" phone
            currency: "BDT",
            classes: [],
            batches: [],
          },
        },
      ],
      { session },
    );

    const coaching = coachingArray[0];

    // 5. Create the primary Admin user
    const adminUserArray = await User.create(
      [
        {
          name: data.adminName || `${data.name} Admin`,
          email: centerEmail,
          password: data.adminPassword || data.password,
          role: "admin",
          coaching_id: coaching._id,
        },
      ],
      { session },
    );

    const adminUser = adminUserArray[0];

    // 6. Link admin to center and commit
    coaching.admin_id = adminUser._id;
    await coaching.save({ session });

    await session.commitTransaction();
    return coaching;
  } catch (error) {
    await session.abortTransaction();
    console.error("TRANSACTION FAILED:", error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Calculates real-time subscription status and returns full data
 */
exports.getCenterStatus = async (coachingId) => {
  const center = await Coaching.findById(coachingId).populate(
    "admin_id",
    "name email",
  );
  if (!center) throw new Error("Center not found");

  const now = new Date();
  const expiry = new Date(center.trialExpiryDate);

  // Calculate remaining time
  const diffTime = expiry - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isTrialActive =
    center.subscriptionStatus === "trial" && daysRemaining > 0;

  return {
    ...center._doc,
    daysRemaining: Math.max(0, daysRemaining),
    isTrialActive,
    isExpired: diffTime <= 0 || center.subscriptionStatus === "expired",
  };
};

/**
 * @desc    Updates license status and syncs center fields (Super-Admin only)
 */
exports.updateLicense = async (id, updateData) => {
  const updateFields = {
    subscriptionStatus: updateData.subscriptionStatus,
    paymentProcessed: updateData.paymentProcessed,
    email: updateData.adminEmail || updateData.email,
    "settings.contactNumber": updateData.phone,
  };

  if (updateData.resetTrial) {
    const newStart = new Date();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 14);

    updateFields.trialStartDate = newStart;
    updateFields.trialExpiryDate = newExpiry;
  }

  const coaching = await Coaching.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true },
  );

  return coaching;
};

/**
 * @desc   Returns all coaching centers for Super-Admin management
 * @fix    Ensures all required fields for the Cluster Nodes UI are present
 */
exports.getAllCenters = async () => {
  const centers = await Coaching.find({})
    .select(
      "name email slug settings subscriptionStatus paymentProcessed joinedAt trialExpiryDate createdAt",
    )
    .sort({ createdAt: -1 })
    .lean();

  // Normalize data so the React table 'node.phone' and 'node.trialExpiryDate' work
  return centers.map((center) => ({
    ...center,
    phone: center.settings?.contactNumber || "N/A",
    // Ensure the date object is ready for the frontend calculation
    trialExpiryDate: center.trialExpiryDate || null,
    joinedAt: center.joinedAt || center.createdAt,
  }));
};
