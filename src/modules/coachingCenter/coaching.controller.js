const coachingService = require("./coaching.service");
const Coaching = require("./coaching.model");
const User = require("../users/user.model"); // Import User model to support aggregation joins

/**
 * @desc    Registers a new center and creates an initial admin user
 * @route   POST /api/v1/coaching/register
 */
exports.registerCenter = async (req, res) => {
  try {
    // Uses atomic transaction via service to create center and admin user
    const coaching = await coachingService.createCenter(req.body);
    res.status(201).json({ success: true, data: coaching });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Fetch all center nodes with linked admin data for Super-Admin
 * @route   GET /api/v1/coaching/all
 * FIX: Merges contact info to resolve "Invalid Date" and missing email issues
 */
exports.getAllCenters = async (req, res) => {
  try {
    const centers = await Coaching.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "coaching_id",
          as: "admin_node",
        },
      },
      {
        $project: {
          _id: 1, // <--- CRITICAL: Explicitly include the ID
          name: 1,
          slug: 1,
          subscriptionStatus: 1,
          paymentProcessed: 1,
          createdAt: 1,
          trialStartDate: 1,
          // Pull contact info from the first matching user node
          email: { $arrayElemAt: ["$admin_node.email", 0] },
          phone: { $arrayElemAt: ["$admin_node.phone", 0] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Send the array directly or ensure frontend reads the 'data' key
    res.status(200).json(centers);
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
      req.coaching_id, // Identifies center via coachingScope middleware
      {
        $set: {
          "settings.classes": settings.classes,
          "settings.batches": settings.batches,
          "settings.currency": settings.currency || "BDT",
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
    const { type, value } = req.params; // type = 'classes' or 'batches'
    const field = `settings.${type}`;

    const coaching = await Coaching.findByIdAndUpdate(
      req.coaching_id,
      { $pull: { [field]: value } }, // Removes specific value from the array
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
    // Allows manual overrides for subscriptionStatus, paymentProcessed, and trialStartDate
    const coaching = await Coaching.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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
 * @desc    Delete a coaching node and purge its registry (Super-Admin Only)
 */
exports.deleteCenter = async (req, res) => {
  try {
    await Coaching.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Center node purged from registry",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
