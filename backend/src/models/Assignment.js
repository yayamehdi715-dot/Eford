const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000 },
  teacher:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fileUrl:     { type: String }, // URL presignée ou publique R2
  fileKey:     { type: String }, // clé R2 pour suppression
  fileName:    { type: String },
  fileSize:    { type: Number },
  dueDate:     { type: Date },
  createdAt:   { type: Date, default: Date.now },
});

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ teacher: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
