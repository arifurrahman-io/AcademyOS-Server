const coachingService = require("./coaching.service");
const Coaching = require("./coaching.model");
const User = require("../users/user.model");
const mongoose = require("mongoose");

/**
 * @desc    Registers a new center and creates an initial admin user
 * @route   POST /api/v1/coaching/register
 */
exports.registerCenter = async (req, res) => {
  try {
    const coaching = await coachingService.createCenter(req.body);
    res.status(201).json({ success: true, data: coaching });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Fetch all centers for Super-Admin management
 * @route   GET /api/v1/coaching/all
 * Projection updated to include official email, phone, joinedAt, and trialExpiryDate.
 */

exports.getAllCenters = async (req, res) => {
  try {
    const centers = await Coaching.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "admin_id",
          foreignField: "_id",
          as: "admin_details",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          subscriptionStatus: 1,
          paymentProcessed: 1, // Project this to remove "Billing Warning"
          createdAt: 1,
          joinedAt: 1,
          trialExpiryDate: 1, // Needed for the Trial Health bar
          email: 1,
          // FIX: Map the nested DB field to 'phone' for the frontend table
          phone: {
            $ifNull: [
              "$settings.contactNumber",
              { $arrayElemAt: ["$admin_details.phone", 0] },
              "N/A",
            ],
          },
          subscription: {
            plan: "$subscription.plan",
            status: "$subscription.status",
            startAt: "$subscription.startAt",
            endAt: "$subscription.endAt",
          },

          settings: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({ success: true, data: centers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update Institute Settings (Classes & Batches)
 * @access  Private (Coaching Admin)
 */
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    const coaching = await Coaching.findByIdAndUpdate(
      req.coaching_id,
      {
        $set: {
          "settings.classes": settings.classes,
          "settings.batches": settings.batches,
          "settings.currency": settings.currency || "BDT",
          "settings.contactNumber": settings.contactNumber, // Support updating phone
        },
      },
      { new: true, runValidators: true },
    );

    if (!coaching) {
      return res
        .status(404)
        .json({ success: false, message: "Coaching node not found" });
    }

    res.status(200).json({ success: true, data: coaching.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove an item from settings (Delete Class or Batch)
 */
exports.removeFromSettings = async (req, res) => {
  try {
    const { type, value } = req.params;
    const field = `settings.${type}`;

    const coaching = await Coaching.findByIdAndUpdate(
      req.coaching_id,
      { $pull: { [field]: value } },
      { new: true },
    );

    res.status(200).json({ success: true, data: coaching.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update Center status or subscription (Super-Admin Only)
 * @route   PUT /api/v1/coaching/:id
 */
exports.updateCenterStatus = async (req, res) => {
  try {
    // If resetting trial, we handle calculation in service or here
    const updateData = req.body;

    if (updateData.resetTrial) {
      updateData.trialStartDate = new Date();
      // Calculate 14 days from now for expiry
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      updateData.trialExpiryDate = expiry;
    }

    const coaching = await Coaching.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!coaching) {
      return res
        .status(404)
        .json({ success: false, message: "Node not found" });
    }

    res.status(200).json({ success: true, data: coaching });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a coaching node
 */
exports.deleteCenter = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const centerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Invalid center ID" });
    }

    // 1️⃣ Delete all users under this coaching center
    await User.deleteMany({ coaching_id: centerId }, { session });

    // 2️⃣ Delete the coaching center
    const deletedCenter = await Coaching.findByIdAndDelete(centerId, {
      session,
    });

    if (!deletedCenter) {
      throw new Error("Center not found");
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Node and associated users decommissioned successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

// coaching.controller.js
exports.getMyCenter = async (req, res) => {
  try {
    const coaching = await Coaching.findById(req.coaching_id)
      .select(
        "name slug email subscriptionStatus trialStartDate trialExpiryDate paymentProcessed subscription settings",
      )
      .lean();

    if (!coaching) {
      return res
        .status(404)
        .json({ success: false, message: "Center not found" });
    }

    return res.status(200).json({ success: true, data: coaching });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
