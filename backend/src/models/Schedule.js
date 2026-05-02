const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  course: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Course',
    required: true,
  },
  room: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Room',
    required: true,
  },
  teacher: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  dayOfWeek: {
    type:     Number,
    required: true,
    min:      0,   // 0 = Dimanche
    max:      6,   // 6 = Samedi
  },
  startTime: {
    type:     String,
    required: true,
    match:    /^([01]\d|2[0-3]):[0-5]\d$/,  // format HH:MM
  },
  endTime: {
    type:     String,
    required: true,
    match:    /^([01]\d|2[0-3]):[0-5]\d$/,  // format HH:MM
  },
}, {
  timestamps: true,
});

// Index pour accélérer les recherches de conflits
scheduleSchema.index({ dayOfWeek: 1, room: 1 });
scheduleSchema.index({ dayOfWeek: 1, teacher: 1 });
scheduleSchema.index({ course: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);

// 📁 Emplacement : Eford-main/backend/src/models/Schedule.js
