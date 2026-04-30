const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 50 },
  capacity:    { type: Number, required: true, min: 1, max: 500 },
  equipment:   { type: String, trim: true, maxlength: 500 },
  isAvailable: { type: Boolean, default: true },
});

module.exports = mongoose.model('Room', roomSchema);
