const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  coaching_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CoachingCenter', 
    required: true 
  },
  // Reference to login credentials if students are given app access
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }, 
  name: { 
    type: String, 
    required: [true, 'Student name is required'],
    trim: true 
  },
  roll_number: { 
    type: String, 
    required: [true, 'Roll number is required'],
    trim: true 
  },
  // Added class_level to match AcademyOS frontend requirements
  class_level: { 
    type: String, 
    required: [true, 'Academic Level is required'],
    trim: true 
  },
  batch: { 
    type: String, 
    required: [true, 'Batch is required'],
    trim: true 
  },
  phone: {
    type: String,
    trim: true
  },
  guardian_phone: {
    type: String,
    trim: true
  },
  // Financial profile for auto-setting fees
  admission_fee: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  monthly_fee: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  admission_date: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, { 
  timestamps: true,
  // Ensures virtuals are included when converting to JSON for the frontend
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * CRITICAL INDEXING
 * 1. Ensures roll number is unique ONLY within a specific coaching center node.
 * 2. Optimized for searching by name and status.
 */
studentSchema.index({ coaching_id: 1, roll_number: 1 }, { unique: true });
studentSchema.index({ coaching_id: 1, name: 1 });

module.exports = mongoose.model('Student', studentSchema);