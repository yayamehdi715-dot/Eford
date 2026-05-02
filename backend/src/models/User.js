const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:     { type: String, required: true, trim: true, maxlength: 50 },
  lastName:      { type: String, required: true, trim: true, maxlength: 50 },
  email:         { type: String, lowercase: true, trim: true, sparse: true },
  username:      { type: String, trim: true, lowercase: true, sparse: true },
  password:      { type: String, required: true },
  plainPassword: { type: String, select: false },
  role:          { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  schoolLevel:   { type: String, trim: true },
  phone:         { type: String, trim: true, maxlength: 20 },
  isActive:      { type: Boolean, default: true },
  refreshToken:  { type: String, select: false },
  createdAt:     { type: Date, default: Date.now },
});

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.plainPassword;
    return ret;
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
