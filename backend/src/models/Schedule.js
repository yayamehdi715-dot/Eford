const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  room:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  teacher:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayOfWeek:  { type: Number, required: true, min: 0, max: 6 }, // 0=dim, 1=lun ... 6=sam
  startTime:  { type: String, required: true }, // format "HH:MM"
  endTime:    { type: String, required: true },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
});

scheduleSchema.index({ course: 1 });
scheduleSchema.index({ teacher: 1 });
scheduleSchema.index({ room: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
