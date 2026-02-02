const subscriptionService = require("./subscription.service");

/**
 * Helpers
 */
const pickUserId = (req) => req.user?.id || req.user?._id;
const pickCoachingId = (req) =>
  req.coaching_id || req.user?.coaching_id || req.user?.coachingId;

const send = (res, status, payload) => res.status(status).json(payload);

const badRequest = (res, message, extra = {}) =>
  send(res, 400, { success: false, message, ...extra });

/**
 * Small sanitizers to prevent payload drift / quotes
 */
const safeStr = (v) => (v == null ? "" : String(v).trim());
const normalizeProvider = (v) => safeStr(v).toLowerCase();

/**
 * Coaching admin submits payment proof
 * POST /api/v1/subscriptions/upgrade-center
 *
 * body (supported):
 *  A) { method, senderNumber, transactionId, amount? }
 *  B) { provider, senderNumber, trxId, amount? }
 */
exports.upgradeCenter = async (req, res) => {
  try {
    const coachingId = pickCoachingId(req);
    const userId = pickUserId(req);

    if (!coachingId)
      return badRequest(res, "Missing coaching_id (coachingScope failed)");
    if (!userId) return badRequest(res, "Missing user id (protect failed)");

    const body = req.body || {};

    // ✅ accept both names
    const provider = normalizeProvider(body.method || body.provider);
    const senderNumber = safeStr(body.senderNumber);
    const transactionId = safeStr(body.transactionId || body.trxId);
    const amount =
      body.amount !== undefined && body.amount !== null
        ? Number(body.amount)
        : undefined;

    if (!provider || !senderNumber || !transactionId) {
      return badRequest(
        res,
        "method/provider, senderNumber, transactionId/trxId are required",
        {
          expected: {
            method: "bkash | nagad",
            senderNumber: "017XXXXXXXX",
            transactionId: "ABC123...",
            amount: "(optional) number",
          },
        },
      );
    }

    if (!["bkash", "nagad"].includes(provider)) {
      return badRequest(res, "Invalid provider. Use bkash or nagad");
    }

    if (amount !== undefined) {
      if (!Number.isFinite(amount) || amount < 1) {
        return badRequest(res, "Invalid amount");
      }
    }

    const payment = await subscriptionService.submitPaymentProof({
      coachingId,
      userId,
      payload: {
        method: provider, // keep service happy (it maps to provider)
        senderNumber,
        transactionId,
        amount,
      },
    });

    return send(res, 201, {
      success: true,
      message: "Payment submitted. Waiting for verification.",
      data: payment,
    });
  } catch (e) {
    const status = e.statusCode || 400;
    return send(res, status, {
      success: false,
      message: e.message || "Payment submission failed",
      code: e.code,
    });
  }
};

/**
 * Super-admin monitor all centers + latest payment
 * GET /api/v1/subscriptions/monitor-all
 */
exports.monitorAll = async (req, res) => {
  try {
    const data = await subscriptionService.getMonitorAll();
    return send(res, 200, { success: true, data });
  } catch (e) {
    const status = e.statusCode || 500;
    return send(res, status, {
      success: false,
      message: e.message || "Failed to load monitor data",
      code: e.code,
    });
  }
};

/**
 * Super-admin list payments
 * GET /api/v1/subscriptions/payments?status=pending|verified|rejected&q=&page=&limit=
 */
exports.listPayments = async (req, res) => {
  try {
    const {
      status = "pending",
      q = "",
      page = "1",
      limit = "20",
    } = req.query || {};

    const data = await subscriptionService.listPayments({
      status,
      q,
      page,
      limit,
    });

    return send(res, 200, { success: true, data });
  } catch (e) {
    const status = e.statusCode || 500;
    return send(res, status, {
      success: false,
      message: e.message || "Failed to load payments",
      code: e.code,
    });
  }
};

/**
 * Super-admin verify/reject a payment
 * PUT /api/v1/subscriptions/payments/:paymentId/verify
 * body: { action: "verify" | "reject", note?: string }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params || {};
    const { action, note } = req.body || {};
    const superAdminId = pickUserId(req);

    if (!paymentId) return badRequest(res, "Missing paymentId");
    if (!superAdminId)
      return badRequest(res, "Missing superAdminId (protect failed)");
    if (!action) return badRequest(res, "Missing action");

    const normalizedAction = safeStr(action).toLowerCase();
    if (!["verify", "reject"].includes(normalizedAction)) {
      return badRequest(res, 'Invalid action. Use "verify" or "reject"');
    }

    const result = await subscriptionService.verifyPayment({
      paymentId,
      action: normalizedAction,
      superAdminId,
      note: note ? safeStr(note) : "",
    });

    return send(res, 200, {
      success: true,
      message:
        normalizedAction === "reject" ? "Payment rejected" : "Payment verified",
      data: result,
    });
  } catch (e) {
    const status = e.statusCode || 400;
    return send(res, status, {
      success: false,
      message: e.message || "Payment verification failed",
      code: e.code,
    });
  }
};

/**
 * Coaching admin status
 * GET /api/v1/subscriptions/my-status
 */
exports.myStatus = async (req, res) => {
  try {
    const coachingId = pickCoachingId(req);
    if (!coachingId) return badRequest(res, "Missing coaching_id");

    const data = await subscriptionService.getMyStatus(coachingId);
    return send(res, 200, { success: true, data });
  } catch (e) {
    const status = e.statusCode || 400;
    return send(res, status, {
      success: false,
      message: e.message || "Failed to load subscription status",
      code: e.code,
    });
  }
};
