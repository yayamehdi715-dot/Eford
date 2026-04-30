const mongoose = require('mongoose');

const absenceSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:     { type: Date, required: true },
  type:     { type: String, enum: ['teacher', 'student'], required: true },
  reason:   { type: String, trim: true, maxlength: 500 },
  notified: { type: Boolean, default: false }, // élèves prévenus
});

absenceSchema.index({ user: 1 });
absenceSchema.index({ course: 1 });
absenceSchema.index({ date: 1 });

module.exports = mongoose.model('Absence', absenceSchema);
