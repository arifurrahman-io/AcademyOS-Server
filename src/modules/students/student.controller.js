const studentService = require('./student.service');

/**
 * @desc    Enroll new student
 * @route   POST /api/v1/students
 */
exports.createStudent = async (req, res) => {
  try {
    const student = await studentService.addStudent(req.body, req.coaching_id);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.code === 11000 ? 'Roll number already exists in this center' : error.message 
    });
  }
};

/**
 * @desc    Get all students for a center (with filters)
 * @route   GET /api/v1/students
 */
exports.getStudents = async (req, res) => {
  try {
    const { batch, status } = req.query;
    const filters = {};
    if (batch) filters.batch = batch;
    if (status) filters.status = status;

    const students = await studentService.getStudentList(req.coaching_id, filters);
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single student profile
 * @route   GET /api/v1/students/:id
 * @fix     Enables Profile View and Edit Page data fetching
 */
exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id, req.coaching_id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update student record
 * @route   PUT /api/v1/students/:id
 * @fix     Enables the Edit Form to save changes
 */
exports.updateStudent = async (req, res) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.coaching_id, req.body);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete student record
 * @route   DELETE /api/v1/students/:id
 * @fix     Enables the Delete button in StudentList
 */
exports.deleteStudent = async (req, res) => {
  try {
    const student = await studentService.removeStudent(req.params.id, req.coaching_id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    res.status(200).json({ success: true, message: "Student removed from registry" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};