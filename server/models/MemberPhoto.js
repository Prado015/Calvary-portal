// Member photos live in their own collection so member lists stay small and fast.
// The browser loads a photo through a signed URL (see utils/signing.js), so <img> tags work without a login header.
const mongoose = require('mongoose');

const MemberPhotoSchema = new mongoose.Schema({
  member:      { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, unique: true },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  data:        { type: Buffer, required: true },
  size:        { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('MemberPhoto', MemberPhotoSchema);
