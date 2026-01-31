const Coaching = require("./coaching.model");
const User = require("../users/user.model"); // Required to link the admin node
const mongoose = require("mongoose");

/**
 * @desc    Registers a new coaching center and initializes the admin account
 * @param   {Object} data - Contains center details and admin credentials
 */
exports.createCenter = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check if slug is taken
    const existing = await Coaching.findOne({ slug: data.slug });
    if (existing) throw new Error("Subdomain/Slug already in use");

    // 2. Initialize the Coaching Center node
    const coaching = await Coaching.create(
      [
        {
          name: data.name,
          slug: data.slug,
          subscriptionStatus: data.subscriptionStatus || "trial",
          paymentProcessed: data.paymentProcessed ?? true,
          trialStartDate: data.trialStartDate || new Date(),
        },
      ],
      { session },
    );

    // 3. Create the primary Admin user for this center
    const adminUser = await User.create(
      [
        {
          name: `${data.name} Admin`,
          email: data.adminEmail,
          password: data.adminPassword,
          role: "admin",
          coaching_id: coaching[0]._id,
        },
      ],
      { session },
    );

    // 4. Link admin to center and commit
    coaching[0].admin_id = adminUser[0]._id;
    await coaching[0].save({ session });

    await session.commitTransaction();
    return coaching[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Calculates real-time subscription status for a node
 */
exports.getCenterStatus = async (coachingId) => {
  const center = await Coaching.findById(coachingId);
  if (!center) throw new Error("Center not found");

  // Calculate if trial is still valid based on trialStartDate
  const now = new Date();
  const start = new Date(center.trialStartDate);
  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Trial is active if status is 'trial' and within 7 days
  const trialLimit = 7;
  const isTrialActive =
    center.subscriptionStatus === "trial" && diffDays < trialLimit;

  return {
    ...center._doc,
    daysUsed: Math.max(0, diffDays),
    daysRemaining: Math.max(0, trialLimit - diffDays),
    isTrialActive,
    isExpired:
      center.subscriptionStatus === "expired" ||
      (center.subscriptionStatus === "trial" && diffDays >= trialLimit),
  };
};

/**
 * @desc    Updates license status (Super-Admin only)
 */
exports.updateLicense = async (id, updateData) => {
  const coaching = await Coaching.findByIdAndUpdate(
    id,
    {
      $set: {
        subscriptionStatus: updateData.subscriptionStatus,
        paymentProcessed: updateData.paymentProcessed,
        // Reset trial date if manually requested
        ...(updateData.resetTrial && { trialStartDate: new Date() }),
      },
    },
    { new: true },
  );
  return coaching;
};
