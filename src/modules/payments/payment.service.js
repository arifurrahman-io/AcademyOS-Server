const Payment = require('./payment.model');
const Student = require('../students/student.model');

exports.recordPayment = async (paymentData, coachingId, userId) => {
  paymentData.coaching_id = coachingId;
  paymentData.collectedBy = userId;
  return await Payment.create(paymentData);
};

exports.getDefaulters = async (coachingId, targetMonth) => {
  // 1. Get all active students in this coaching center
  const allStudents = await Student.find({ coaching_id: coachingId, status: 'active' });

  // 2. Get IDs of students who have paid for this month
  const paidRecords = await Payment.find({ 
    coaching_id: coachingId, 
    month: targetMonth 
  }).select('student_id');
  
  const paidStudentIds = paidRecords.map(p => p.student_id.toString());

  // 3. Filter students who are NOT in the paid list
  const defaulters = allStudents.filter(student => 
    !paidStudentIds.includes(student._id.toString())
  );

  return defaulters;
};