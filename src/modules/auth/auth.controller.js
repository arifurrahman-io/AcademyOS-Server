const authService = require("./auth.service");
const Coaching = require("../coachingCenter/coaching.model");
const coachingService = require("../coachingCenter/coaching.service");

/**
 * @desc    Login Controller
 * Handles trial logic and fetches unified settings from the Coaching Node.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
    }

    const { user, token, isTrialExpired } = await authService.loginUser(
      email,
      password,
    );

    // Fetch the associated Coaching Center for real-time settings
    const coaching = await Coaching.findById(user.coaching_id);

    res.status(200).json({
      success: true,
      token,
      trialExpired: isTrialExpired,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        coaching_id: user.coaching_id,
        settings: {
          classes: coaching?.settings?.classes || [],
          batches: coaching?.settings?.batches || [],
          currency: coaching?.settings?.currency || "BDT",
          contactNumber:
            coaching?.settings?.contactNumber || coaching?.email || "",
        },
        subscriptionStatus: coaching?.subscriptionStatus || "trial",
        trialExpiryDate: coaching?.trialExpiryDate || null,
      },
    });
  } catch (error) {
    let statusCode = 500;
    let message = error.message;

    if (error.message === "Invalid credentials") {
      statusCode = 401;
    } else if (error.name === "ValidationError") {
      statusCode = 400;
      message = Object.values(error.errors)
        .map((val) => val.message)
        .join(", ");
    }

    res.status(statusCode).json({ success: false, message });
  }
};

/**
 * @desc    Register Center Controller
 * Bridges frontend payload to the Atomic Service Transaction.
 */
exports.registerCenter = async (req, res) => {
  try {
    const { name, slug, adminEmail, adminPassword } = req.body;

    // 1. Pre-validation to prevent "Path email is required" silent crashes
    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Field 'adminEmail' is required for node provisioning",
      });
    }

    if (!name || !slug || !adminPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required registration fields (Name, Slug, or Password)",
      });
    }

    // 2. Execute the service transaction
    // Passing req.body which contains: name, slug, adminEmail, adminPassword, and phone
    const coaching = await coachingService.createCenter(req.body);

    res.status(201).json({
      success: true,
      message: "Infrastructure provisioned successfully",
      data: coaching,
    });
  } catch (error) {
    // Return 400 for validation errors or duplicate slugs
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Setup Root Administrator
 */
exports.setupRoot = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Safety check for existing root
    const User = require("../users/user.model");
    const exists = await User.findOne({ role: "super-admin" });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Root node already exists" });
    }

    const coaching = await coachingService.createCenter({
      name: "AcademyOS System",
      slug: "root-node",
      adminEmail: email,
      adminPassword: password,
      subscriptionStatus: "paid",
      role: "super-admin",
    });

    res.status(201).json({
      success: true,
      message: "System Root established",
      data: coaching,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
