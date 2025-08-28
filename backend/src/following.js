// src/following.js
const { User } = require('../models/User');
const { isLoggedIn } = require('./auth');
const {Profile} = require("../models/Profile");

// Get following list
const getFollowing = async (req, res) => {
    const user = req.params.user || req.username;

    try {
        // 查找当前用户
        const foundUser = await User.findOne({ username: user }).exec();
        if (!foundUser) {
            return res.status(404).send({ error: 'No user found. Please enter a correct display name or username.' });
        }

        // 查询 following 列表的用户详情（通过 Profile 查询头像和 headline）
        const followingDetails = await Promise.all(
            foundUser.following.map(async (followedUsername) => {
                const profile = await Profile.findOne({ username: followedUsername }).select('username avatar headline displayName').exec();
                return {
                    username: followedUsername,
                    displayName: profile?.displayName || 'Unknown User',
                    headline: profile?.headline || 'No headline available',
                    avatar: profile?.avatar || 'https://via.placeholder.com/100', // 默认头像
                };
            })
        );

        // 返回数据
        res.status(200).send({ username: user, following: followingDetails });
    } catch (error) {
        console.error('Error fetching following list:', error);
        res.status(500).send({ error: 'Error fetching following list' });
    }
};


// Add a user to the following list
const addFollowing = async (req, res) => {
    const userToFollow = req.body.username; // 从请求体中获取用户名

    if (!userToFollow) {
        return res.status(400).send({ error: 'No user specified to follow' });
    }

    try {
        const currentUser = await User.findOne({ username: req.username }).exec();
        const user = await User.findOne({ username: userToFollow }).exec();

        if (!user) {
            return res.status(404).send({ error: 'No user found. Please enter a correct username.' });
        }
        if (userToFollow === req.username) {
            return res.status(400).send({ error: 'You cannot follow yourself.' });
        }
        if (currentUser.following.includes(userToFollow)) {
            return res.status(400).send({ error: 'You have already added this follower.' });
        }

        currentUser.following.push(userToFollow);
        await currentUser.save();

        // 查询 updated following 列表的用户详情
        const followingDetails = await User.find({ username: { $in: currentUser.following } }).select('username avatar headline displayName');
        res.status(200).send({ username: req.username, following: followingDetails });
    } catch (error) {
        console.error('Error adding following:', error);
        res.status(500).send({ error: 'Error adding following' });
    }
};


// Remove a user from the following list
const removeFollowing = async (req, res) => {
    const userToUnfollow = req.params.user;

    if (!userToUnfollow) {
        return res.status(400).send({ error: 'No user specified to unfollow' });
    }

    try {
        const currentUser = await User.findOne({ username: req.username }).exec();

        if (!currentUser.following.includes(userToUnfollow)) {
            return res.status(400).send({ error: 'User is not in your following list' });
        }

        currentUser.following = currentUser.following.filter(
            user => user !== userToUnfollow
        );
        await currentUser.save();
        res.status(200).send({ username: req.username, following: currentUser.following });
    } catch (error) {
        console.error('Error removing following:', error);
        res.status(500).send({ error: 'Error removing following' });
    }
};

module.exports = (app) => {
    app.get('/following/:user?', isLoggedIn, getFollowing);
    app.put('/following', isLoggedIn, addFollowing);
    app.delete('/following/:user', isLoggedIn, removeFollowing);
};
