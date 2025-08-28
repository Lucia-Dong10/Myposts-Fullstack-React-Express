const mongoose = require('mongoose');

// 子文档：认证信息（不单独生成 _id）
const AuthSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },  // 'google' 等
    id:       { type: String, required: true },  // 第三方的唯一 ID（这里不要写 unique）
    email:    { type: String },
  },
  { _id: false }
);

// 用户 Schema
const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  salt:      { type: String, default: null },
  hash:      { type: String, default: null },
  headline:  { type: String, default: 'This is my headline!' },
  following: {
    type: [String],
    default: [],
    validate: {
      validator: (v) => new Set(v).size === v.length,
      message: 'Following list contains duplicate values',
    },
  },
  // 第三方认证列表
  auth: { type: [AuthSchema], default: [] },
}, { timestamps: true });

// ✅ 与 Atlas 一致的“仅对非空字符串生效”的唯一索引
// 这样既保证 Google ID 全局唯一，又不会因为 null/缺失触发冲突
userSchema.index(
  { 'auth.id': 1 },
  {
    name: 'auth.id_1_nonNull',
    unique: true,
    partialFilterExpression: { 'auth.id': { $exists: true, $type: 'string' } },
  }
);

const User = mongoose.model('User', userSchema);
module.exports = { User };
