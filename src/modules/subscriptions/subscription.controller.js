const subscriptionService = require('./subscription.service');

exports.getAdminDashboard = async (req, res) => {
  try {
    const overview = await subscriptionService.getSubscriptionOverview();
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.manualUpgrade = async (req, res) => {
  try {
    const { coaching_id, plan, durationDays, amount } = req.body;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const subscription = await subscriptionService.upgradeSubscription(coaching_id, {
      plan,
      endDate,
      amountPaid: amount
    });

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};