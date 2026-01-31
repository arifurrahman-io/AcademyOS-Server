const Student = require('./student.model');

/**
 * Enrolls a new student
 */
exports.addStudent = async (studentData, coachingId) => {
  // Always force the coaching_id from the authenticated user
  studentData.coaching_id = coachingId;
  return await Student.create(studentData);
};

/**
 * Retrieves all students for a specific center with optional filters
 */
exports.getStudentList = async (coachingId, filters = {}) => {
  const query = { coaching_id: coachingId, ...filters };
  return await Student.find(query).sort({ name: 1 });
};

/**
 * NEW: Fetches a single student by ID
 * Ensures the student belongs to the requesting center (Data Isolation)
 */
exports.getStudentById = async (studentId, coachingId) => {
  return await Student.findOne({ 
    _id: studentId, 
    coaching_id: coachingId 
  });
};

/**
 * NEW: Updates a student record
 */
exports.updateStudent = async (studentId, coachingId, updateData) => {
  return await Student.findOneAndUpdate(
    { _id: studentId, coaching_id: coachingId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

/**
 * NEW: Removes a student from the database
 * FIX: This resolves the 500 Internal Server Error during deletion
 */
exports.removeStudent = async (studentId, coachingId) => {
  return await Student.findOneAndDelete({ 
    _id: studentId, 
    coaching_id: coachingId 
  });
};