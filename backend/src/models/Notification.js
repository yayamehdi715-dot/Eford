const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = broadcast
  course:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  type:      { type: String, enum: ['absence', 'assignment', 'enrollment', 'general'], required: true },
  title:     { type: String, required: true, maxlength: 200 },
  message:   { type: String, required: true, maxlength: 1000 },
  isRead:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
