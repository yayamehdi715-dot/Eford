const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true, maxlength: 100 },
  description:      { type: String, trim: true, maxlength: 1000 },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room:             { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  maxStudents:      { type: Number, required: true, min: 1, max: 500 },
  requiresApproval: { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  createdAt:        { type: Date, default: Date.now },
});

courseSchema.index({ teacher: 1 });
courseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Course', courseSchema);
