// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// ---------- Heroku 代理 & CORS（必须在 session 之前） ----------
app.set('trust proxy', 1);

// 允许的前端域名（按需修改/补充你的 Surge 域名）
const allowedOrigins = [
  'http://localhost:3000',
  'https://myposts-final.surge.sh',      // ← 换成你的前端域名
  process.env.FRONTEND_URL,              // 可用环境变量补充
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // ★ 允许携带 Cookie
}));

// 预检（可选但推荐）
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ---------- Cloudinary ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'uploads', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage });

// ---------- ENV ----------
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ Missing MONGO_URI / MONGODB_URI');
  process.exit(1);
}
const PORT = process.env.PORT || 3001;

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  mongoose.set('autoIndex', false);   // 不在启动时创建索引
  mongoose.set('autoCreate', false);  // 不自动创建 collection/索引
}

// ---------- Middlewares ----------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ---------- Import routes AFTER middlewares ----------
const { register, login, logout, isLoggedIn } = require('./src/auth');
const articles = require('./src/articles');
const following = require('./src/following');
const profile = require('./src/profile');
const { router: authRoutes } = require('./src/auth');

// ---------- Bootstrap (connect DB → session → passport → routes → listen) ----------
(async () => {
  try {
    console.log('Connecting to MongoDB with URI:', mongoURI);
    await mongoose.connect(mongoURI, {
      autoIndex: !isProd,
      autoCreate: !isProd,
      // 其他可选项
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    // 统一的会话（使用已建立的 mongoose 连接）
    app.use(session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60,
      }),
      cookie: {
        httpOnly: true,
        secure: isProd,                       // Heroku 为 true
        sameSite: isProd ? 'None' : 'Lax',    // 跨站必须 None
      },
    }));

    // Passport（auth.js 内已配置 serialize/deserialize/strategy）
    app.use(passport.initialize());
    app.use(passport.session());

    // 静态文件
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // 后端接口
    app.post('/register', register);
    app.post('/login', login);
    app.put('/logout', isLoggedIn, logout);

    // 业务路由
    // articles 导出有两种可能：函数 (app, upload) 或 express.Router()
    if (typeof articles === 'function') {
      articles(app, upload);
    } else {
      app.use('/articles', articles);
    }
    following(app);
    profile(app, upload);

    // 认证相关（/auth/google 等）
    app.use(authRoutes);

    // 健康检查 & 根路由
    app.get('/health', (_req, res) => res.json({ ok: true }));
    app.get('/', (_req, res) =>
      res.send('Hello World! This is your backend server.')
    );

    // 全局错误兜底
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 仅当直接启动时监听（Heroku）
    if (require.main === module) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Backend server is running on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();

module.exports = app;
