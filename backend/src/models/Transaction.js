const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['income', 'expense'], required: true },
  category:    { type: String, enum: ['inscription', 'salaire', 'materiel', 'autre'], required: true },
  amount:      { type: Number, required: true, min: 0 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  date:        { type: Date, required: true, default: Date.now },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now },
});

transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
