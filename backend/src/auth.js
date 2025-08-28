// backend/src/auth.js
const express = require('express');
const md5 = require('md5');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const { User } = require('../models/User');
const { Profile } = require('../models/Profile');

const router = express.Router();

// ------- ENV -------
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001';

// --------------- Auth guards ---------------
/**
 * 统一的登录校验：
 * - 优先使用 Passport（OAuth 登录）
 * - 其次使用我们在本地账号/密码登录时写入的 req.session.userId
 */
const isLoggedIn = async (req, res, next) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      req.username = req.user.username;
    } else if (req.session?.userId) {
      const u = await User.findById(req.session.userId);
      if (!u) return res.status(401).send({ error: 'Unauthorized' });
      req.username = u.username;
    } else {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const p = await Profile.findOne({ username: req.username });
    req.avatar = p?.avatar || 'https://via.placeholder.com/50';
    next();
  } catch (e) {
    console.error('isLoggedIn error:', e);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

// --------------- Passport (Google) ---------------
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (e) { done(e, null); }
});

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${BACKEND_URL}/auth/google/callback`,
  },
  /**
   * 只在此处为 Google 用户写入/更新文档：
   * - auth 是数组：[{ provider:'google', id, email }]
   * - 请在 MongoDB 给 auth.id 建 “unique + partialFilterExpression” 索引：
   *   { unique: true, partialFilterExpression: { 'auth.id': { $exists:true, $ne:null } } }
   */
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      if (!googleId) return done(new Error('Google OAuth missing profile.id'));

      const email = profile.emails?.[0]?.value ?? null;
      const displayName = profile.displayName?.trim() || `google_${googleId.slice(-6)}`;

      // 已经绑定过 Google
      let user = await User.findOne({ 'auth.id': googleId });
      if (user) return done(null, user);

      // 如果用户名冲突，生成一个唯一用户名
      let candidate = displayName;
      let suffix = 1;
      while (await User.exists({ username: candidate })) {
        candidate = `${displayName}_${suffix++}`;
        if (suffix > 50) { // 兜底
          candidate = `google_${googleId.slice(-8)}`;
          break;
        }
      }

      // 创建或合并
      user = await User.create({
        username: candidate,
        auth: [{ provider: 'google', id: googleId, email }],
        // 其他本地注册字段可缺省
      });

      // 自动创建 Profile（如果你的业务需要）
      await Profile.updateOne(
        { username: user.username },
        {
          $setOnInsert: {
            username: user.username,
            displayName: candidate,
            email,
            headline: "This is my headline!",
            avatar: 'https://via.placeholder.com/50'
          }
        },
        { upsert: true }
      );

      return done(null, user);
    } catch (err) {
      console.error('Error during Google OAuth callback:', err);
      return done(err, null);
    }
  }
));

// Google 登录入口：强制每次选择账号，避免自动复用上次账号
router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google 回调：成功后把会话写盘再跳回前端
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/` }),
  (req, res) => {
    req.session.save(() => res.redirect(`${FRONTEND_URL}/main`));
  }
);

// --------------- Local Register/Login/Logout ---------------
/**
 * 注册：只写本地字段，不要写 auth.id:null
 * 冲突（11000）返回 409，而不是 500
 */
const register = async (req, res) => {
  const { name, displayName, email, birthday, phone, zipcode, password } = req.body;
  if (!name || !displayName || !email || !birthday || !phone || !zipcode || !password) {
    return res.status(400).send({ error: 'All fields are required' });
  }

  try {
    if (await User.exists({ username: name })) {
      return res.status(409).send({ error: 'Username already exists' });
    }

    const salt = md5(name + Date.now());
    const hash = md5(password + salt);

    const user = await User.create({
      username: name,
      salt,
      hash,
      following: []
    });

    await Profile.create({
      username: name,
      displayName,
      email,
      birthday,
      phone,
      zipcode,
      avatar: 'https://th.bing.com/th/id/OIP.akEXjXSun7zbVDGMJUegdgHaHa?w=650&h=650&rs=1&pid=ImgDetMain'
    });

    return res.status(201).send({
      result: 'success',
      user: {
        id: user._id,
        username: user.username,
        displayName,
        email,
        birthday,
        phone,
        zipcode
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).send({ error: 'User already exists' });
    }
    console.error('Error during registration:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const { loginName, loginPassword } = req.body;
  if (!loginName || !loginPassword) {
    return res.status(400).send({ error: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username: loginName });
    if (!user) return res.status(401).send({ error: 'Invalid username or password' });

    const hash = md5(loginPassword + user.salt);
    if (hash !== user.hash) return res.status(401).send({ error: 'Invalid username or password' });

    const profile = await Profile.findOne({ username: loginName });

    // 统一使用 express-session（MongoStore）保存登录态
    req.session.userId = user._id;

    return res.status(200).send({
      result: 'success',
      user: {
        id: user._id,
        username: user.username,
        displayName: profile?.displayName,
        email: profile?.email,
        birthday: profile?.birthday,
        phone: profile?.phone,
        zipcode: profile?.zipcode
      }
    });
  } catch (e) {
    console.error('Error during login:', e);
    return res.status(500).send({ error: 'Internal server error' });
  }
};

const logout = (req, res) => {
  // 同时处理 Passport 与本地会话
  req.logout?.(() => {
    req.session.destroy(() => {
      // 默认 cookie 名为 connect.sid
      res.clearCookie('connect.sid', { path: '/' });
      res.status(200).send({ message: 'Logged out successfully' });
    });
  });
};

// 绑定/解绑/合并：保留你的实现，但依赖 isLoggedIn（基于同一套 session）
router.post('/link-account', isLoggedIn, async (req, res) => {
  const { provider, id } = req.body;
  if (!provider || !id) return res.status(400).send({ error: 'Invalid provider or id' });

  try {
    const user = await User.findOne({ username: req.username });
    const exists = user.auth?.some(a => a.provider === provider && a.id === id);
    if (exists) return res.status(400).send({ error: 'Account already linked' });

    user.auth = user.auth || [];
    user.auth.push({ provider, id });
    await user.save();
    res.status(200).send({ message: 'Account linked successfully', user });
  } catch (e) {
    console.error('Error linking account:', e);
    res.status(500).send({ error: 'Internal server error' });
  }
});

router.post('/unlink-account', isLoggedIn, async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).send({ error: 'Invalid provider' });
  try {
    const user = await User.findOne({ username: req.username });
    const before = user.auth?.length || 0;
    user.auth = (user.auth || []).filter(a => a.provider !== provider);
    if (user.auth.length === before) return res.status(400).send({ error: 'Account not linked to this provider' });
    await user.save();
    res.status(200).send({ message: 'Account unlinked successfully', user });
  } catch (e) {
    console.error('Error unlinking account:', e);
    res.status(500).send({ error: 'Internal server error' });
  }
});

router.post('/merge-account', isLoggedIn, async (req, res) => {
  const { provider, id } = req.body;
  if (!provider || !id) return res.status(400).send({ error: 'Invalid provider or id' });
  try {
    const current = await User.findOne({ username: req.username });
    const target = await User.findOne({ auth: { $elemMatch: { provider, id } } });
    if (!target || String(target._id) === String(current._id)) {
      return res.status(404).send({ error: 'No account to merge' });
    }
    current.following = Array.from(new Set([...(current.following || []), ...(target.following || [])]));
    current.auth = Array.from(new Set([...(current.auth || []), ...(target.auth || [])]));
    await current.save();
    await User.deleteOne({ _id: target._id });
    res.status(200).send({ message: 'Account merged successfully', user: current });
  } catch (e) {
    console.error('Error merging account:', e);
    res.status(500).send({ error: 'Internal server error' });
  }
});

module.exports = {
  register,
  login,
  logout,
  isLoggedIn,
  router
};
