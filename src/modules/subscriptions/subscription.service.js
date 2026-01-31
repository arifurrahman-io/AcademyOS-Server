const Subscription = require('./subscription.model');
const Coaching = require('../coachingCenter/coaching.model');

exports.getSubscriptionOverview = async () => {
  const centers = await Coaching.find().populate('admin_id', 'name email');
  
  return centers.map(center => {
    const daysSinceJoin = Math.ceil((new Date() - center.trialStartDate) / (1000 * 60 * 60 * 24));
    return {
      name: center.name,
      status: center.subscriptionStatus,
      daysUsed: daysSinceJoin,
      isExpired: center.subscriptionStatus === 'trial' && daysSinceJoin > 7,
      email: center.admin_id?.email
    };
  });
};

exports.upgradeSubscription = async (coachingId, planDetails) => {
  // Update the Coaching Center main status
  await Coaching.findByIdAndUpdate(coachingId, { 
    subscriptionStatus: 'active' 
  });

  // Record the transaction
  return await Subscription.create({
    coaching_id: coachingId,
    ...planDetails,
    status: 'active'
  });
};