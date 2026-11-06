// Tamper-proof tokens, so nobody can guess another member's QR code or photo link.
// Both are HMAC signatures made with a key derived from JWT_SECRET.
const crypto = require('crypto');

const key = (purpose) => `${process.env.JWT_SECRET || 'dev-secret'}:${purpose}`;
const sign = (purpose, value, len) =>
  crypto.createHmac('sha256', key(purpose)).update(String(value)).digest('base64url').slice(0, len);

function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// QR payload printed on member cards:  CTC1.<memberId>.<signature>
const memberQrToken = (memberId) => `CTC1.${memberId}.${sign('qr', memberId, 12)}`;

// Returns the member id when the token is genuine, otherwise null.
function verifyMemberQrToken(token) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'CTC1' || !/^[a-f0-9]{24}$/i.test(parts[1])) return null;
  return safeEqual(parts[2], sign('qr', parts[1], 12)) ? parts[1] : null;
}

const photoSignature = (memberId) => sign('photo', memberId, 16);
const verifyPhotoSignature = (memberId, sig) => safeEqual(sig || '', photoSignature(memberId));
const photoUrl = (memberId, version) => `/api/members/${memberId}/photo?v=${version}&s=${photoSignature(memberId)}`;

module.exports = { memberQrToken, verifyMemberQrToken, photoSignature, verifyPhotoSignature, photoUrl };
