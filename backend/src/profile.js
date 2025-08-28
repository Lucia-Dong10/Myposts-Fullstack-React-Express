const { Profile } = require('../models/Profile'); // 引入新的 Profile 模型
const { User } = require('../models/User'); // 仍然需要 User 模型处理认证相关的逻辑
const { isLoggedIn } = require('./auth');
const md5 = require('md5');

// 辅助函数：获取 Profile
const findProfile = async (username) => {
    return Profile.findOne({ username });
};

// 获取用户 headline
const getHeadline = async (req, res) => {
    const username = req.params.user || req.username;

    try {
        const user = await Profile.findOne({ username });
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.status(200).send({ username, headline: user.headline || "No headline available" });
    } catch (error) {
        console.error('Error fetching headline:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// 更新用户 headline
const updateHeadline = async (req, res) => {
    const { headline } = req.body;
    const username = req.username;

    if (!headline) {
        return res.status(400).send({ error: 'Headline is required' });
    }

    try {
        const user = await Profile.findOneAndUpdate(
            { username },
            { headline },
            { new: true } // 返回更新后的文档
        );
        console.log('Updated user:', user); // 打印更新后的用户数据
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.status(200).send({ username, headline: user.headline });
    } catch (error) {
        console.error('Error updating headline:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

const getProfileField = (field) => async (req, res) => {
    const username = req.params.user || req.username;

    try {
        if (field === 'password') {
            // 如果请求的是密码，从 User 模型中获取 hash
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).send({ error: 'User not found' });
            }
            const maskedPassword = user ? user.hash : 'No password set';
            return res.status(200).send({ username, password: maskedPassword });
        } else {
            // 如果请求其他字段，从 Profile 模型中获取
            const profile = await Profile.findOne({ username });
            if (!profile) {
                return res.status(404).send({ error: 'User not found' });
            }
            res.status(200).send({ username, [field]: profile[field] });
        }
    } catch (error) {
        console.error(`Error fetching ${field}:`, error);
        res.status(500).send({ error: 'Internal server error' });
    }
};


// 获取用户的其他属性
const getProfile = async (req, res) => {
    const username = req.username;

    try {
        // 从 Profile 模型中获取用户基本信息
        const profile = await Profile.findOne({ username });
        if (!profile) {
            return res.status(404).send({ error: 'User not found in Profile' });
        }

        // 从 User 模型中获取密码哈希值
        const user = await User.findOne({ username });
        const passwordHash = user ? user.hash : 'No password set';

        // 返回用户的完整信息
        res.status(200).send({
            username: profile.username,
            displayName: profile.displayName,
            email: profile.email,
            phone: profile.phone,
            zipcode: profile.zipcode,
            avatar: profile.avatar,
            password: passwordHash, // 直接返回密码哈希值
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};



// 更新用户的其他属性
const updateProfileField = (field) => async (req, res) => {
    console.log('Received update request:', req.body);

    const { displayName, email, phone, zipcode, password } = req.body;
    const username = req.username;

    if (!displayName && !email && !phone && !zipcode && !password) {
        return res.status(400).send({ error: 'At least one field must be provided to update' });
    }

    try {
        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (email) updates.email = email;
        if (phone) updates.phone = phone;
        if (zipcode) updates.zipcode = zipcode;

        if (password) {
            const salt = md5(username + new Date().getTime());
            const hash = md5(password + salt);

            // 更新密码到 User 模型
            await User.findOneAndUpdate(
                { username },
                { salt, hash },
                { new: true }
            );

            // 同步更新到 Profile 模型中的 password 字段
            updates.hash = hash;
        }

        const updatedProfile = await Profile.findOneAndUpdate(
            { username },
            { $set: updates },
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).send({ error: 'User not found' });
        }

        const user = await User.findOne({ username });
        const passwordHash = user ? user.hash : 'No password set';

        res.status(200).send({
            message: 'Profile updated successfully',
            user: {
                username: updatedProfile.username,
                displayName: updatedProfile.displayName,
                email: updatedProfile.email,
                phone: updatedProfile.phone,
                zipcode: updatedProfile.zipcode,
                avatar: updatedProfile.avatar,
                password: passwordHash, // 返回新的哈希值
            },
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};


// 获取用户 avatar
const getAvatar = async (req, res) => {
    const username = req.params.user || req.username;

    try {
        const user = await Profile.findOne({ username });
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.status(200).send({ username: user.username, avatar: user.avatar });
    } catch (error) {
        console.error('Error fetching avatar:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Upload avatar to Cloudinary
const uploadAvatar = async (file) => {
    try {
        const uploadedResponse = await cloudinary.uploader.upload(file.path, {
            folder: 'avatars',
            resource_type: 'image',
        });
        return uploadedResponse.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Error uploading avatar');
    }
};

// 更新用户 avatar
const updateAvatar = async (req, res) => {
    console.log('Received avatar update request:', req.body);

    const { avatar } = req.body;
    const username = req.username;

    if (!avatar) {
        console.error('Avatar is missing in the request body.');
        return res.status(400).send({ error: 'Avatar is required' });
    }

    try {
        const user = await Profile.findOneAndUpdate(
            { username },
            { avatar },
            { new: true }
        );
        if (!user) {
            console.error('User not found for username:', username);
            return res.status(404).send({ error: 'User not found' });
        }

        const User1 = await User.findOne({ username });
        const passwordHash = User1 ? User1.hash : 'No password set';

        res.status(200).send({
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            phone: user.phone,
            zipcode: user.zipcode,
            avatar: user.avatar,
            password: passwordHash,
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Consolidated routes
module.exports = (app, upload) => {
    app.get('/profile', isLoggedIn, getProfile);
    app.get('/headline/:user?', isLoggedIn, getHeadline);
    app.put('/headline', isLoggedIn, updateHeadline);

    app.get('/email/:user?', isLoggedIn, getProfileField('email'));
    app.put('/email', isLoggedIn, updateProfileField('email'));

    app.get('/zipcode/:user?', isLoggedIn, getProfileField('zipcode'));
    app.put('/zipcode', isLoggedIn, updateProfileField('zipcode'));

    app.get('/phone/:user?', isLoggedIn, getProfileField('phone'));
    app.put('/phone', isLoggedIn, updateProfileField('phone'));

    app.get('/dob/:user?', isLoggedIn, getProfileField('dob'));

    app.get('/avatar/:user?', isLoggedIn, getAvatar);
    app.put('/avatar', isLoggedIn, upload.single('avatar'), updateAvatar);

    app.get('/password/:user?', isLoggedIn, getProfileField('password'));
    app.put('/password', isLoggedIn, updateProfileField('password'));

    app.put('/profile', isLoggedIn, updateProfileField('')); // 确保传递一个空字符串
};
