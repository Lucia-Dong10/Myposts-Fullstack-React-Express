const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    displayName: String, // 显示名称
    email: { type: String, required: true, unique: true  },
    headline: { type: String },
    birthday: { type: Date },
    zipcode: { type: String },
    phone: { type: String },
    avatar: {
        type: String,
        default: 'https://th.bing.com/th/id/OIP.akEXjXSun7zbVDGMJUegdgHaHa?w=650&h=650&rs=1&pid=ImgDetMain', // 默认头像 URL
    },
});

// 创建用户资料模型
const Profile = mongoose.model('Profile', profileSchema);
module.exports = { Profile };
