const mongoose = require('mongoose');
const { Article } = require('../models/Article');
const { isLoggedIn } = require('./auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 配置文件上传路径
const { User } = require('../models/User');
const { Profile } = require('../models/Profile'); // 引入新的 Profile 模型
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 获取文章或特定文章
const getArticles = async (req, res) => {
    const page = Number(req.query.page) || 1; // 当前页
    const limit = Number(req.query.limit) || 10; // 每页限制
    const search = req.query.search || ''; // 搜索关键字
    const username = req.username;

    try {
        const currentUser = await User.findOne({ username }).exec();
        if (!currentUser) {
            return res.status(404).send({ error: 'User not found' });
        }

        const authors = [username, ...currentUser.following]; // 当前用户及其关注者

        // 构建查询条件
        const searchQuery = {
            author: { $in: authors },
        };

        // 如果有搜索关键字，添加模糊搜索条件
        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: 'i' } }, // 模糊匹配标题
                { body: { $regex: search, $options: 'i' } },  // 模糊匹配内容
                { author: { $regex: search, $options: 'i' } }, // 模糊匹配作者
            ];
        }

        // 获取符合条件的文章总数
        const totalArticles = await Article.countDocuments(searchQuery);

        // 获取当前页的文章
        const articles = await Article.find(searchQuery)
            .sort({ timestamp: -1 }) // 按时间排序
            .skip((page - 1) * limit) // 跳过前 (page - 1) * limit 篇文章
            .limit(limit); // 获取 limit 篇文章

        // 返回结果，包括总文章数、当前页文章、当前页和总页数
        res.status(200).send({
            total: totalArticles,
            articles,
            currentPage: page,
            totalPages: Math.ceil(totalArticles / limit),
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).send({ error: 'Error fetching articles' });
    }
};



// 创建文章
const createArticle = async (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).send({ error: 'Title and body are required' });
    }

    let image = null;
    if (req.file) {
        try {
            const result = await cloudinary.uploader.upload(req.file.path);
            image = result.secure_url; // 获取图片的 URL
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).send({ error: 'Error uploading image' });
        }
    }

    try {
        const newArticle = new Article({
            title,
            body,
            image,
            author: req.username,
            comments: [],
        });
        await newArticle.save();
        res.status(201).send({ articles: [newArticle] });
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).send({ error: 'Error creating article' });
    }
};

// 更新文章
const updateArticle = async (req, res) => {
    const id = req.params.id; // 文章 ID
    const { text } = req.body; // 更新的正文内容

    if (!text || text.trim() === '') {
        return res.status(400).send({ error: 'Text content cannot be empty' });
    }

    try {
        // 查找文章
        const article = await Article.findById(id).exec();
        if (!article) {
            return res.status(404).send({ error: 'Article not found' });
        }

        // 检查权限
        if (article.author !== req.username) {
            return res.status(403).send({ error: 'Unauthorized to update this article' });
        }

        article.body = text.trim(); // 更新正文
        await article.save();

        return res.status(200).send({ article });
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).send({ error: 'Error updating article' });
    }
};

// 添加评论
const updateComment = async (req, res) => {
    const id = req.params.id; // 文章 ID
    const { text, commentId } = req.body; // 评论内容和评论 ID

    if (!text || text.trim() === '') {
        return res.status(400).send({ error: 'Comment text cannot be empty' });
    }

    try {
        // 查找文章
        const article = await Article.findById(id).exec();
        if (!article) {
            return res.status(404).send({ error: 'Article not found' });
        }

        // 如果是更新现有评论
        if (commentId) {
            const comment = article.comments.find((c) => c._id.toString() === commentId); // 匹配 `_id`
            if (!comment) {
                return res.status(404).send({ error: 'Comment not found' });
            }

            // 检查权限
            if (comment.author !== req.username) {
                return res.status(403).send({ error: 'Unauthorized to update this comment' });
            }

            comment.text = text.trim(); // 更新评论内容
            comment.timestamp = new Date(); // 更新时间戳
            await article.save();

            return res.status(200).send({ article });
        }

        // 如果是添加新评论
        const profile = await Profile.findOne({ username: req.username });
        const newComment = {
            _id: new mongoose.Types.ObjectId(), // 使用 `_id` 作为唯一标识符
            text: text.trim(),
            author: req.username,
            avatar: profile?.avatar || 'https://via.placeholder.com/50', // 默认头像
            timestamp: new Date(),
        };

        article.comments.push(newComment); // 添加新评论
        await article.save();

        return res.status(201).send({ article });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).send({ error: 'Error updating comment' });
    }
};



// 提取排序逻辑为单独函数
const sortCommentsByTimestamp = (comments) => {
    comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};


const deleteComment = async (req, res) => {
    const { id, commentId } = req.params;

    try {
        const article = await Article.findById(id).exec();
        if (!article) {
            return res.status(404).send({ error: 'Article not found' });
        }

        const commentIndex = article.comments.findIndex((c) => c._id.toString() === commentId);
        if (commentIndex === -1) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        if (article.comments[commentIndex].author !== req.username) {
            return res.status(403).send({ error: 'Unauthorized to delete this comment' });
        }

        article.comments.splice(commentIndex, 1); // 删除评论
        await article.save();

        res.status(200).send({ article });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).send({ error: 'Error deleting comment' });
    }
};






// 路由绑定
module.exports = (app) => {
    app.get('/articles', isLoggedIn, getArticles);
    app.post('/articles', isLoggedIn, upload.single('image'), createArticle);
    app.put('/articles/:id', isLoggedIn, updateArticle); // 更新文章正文
    app.put('/articles/:id/comments', isLoggedIn, updateComment); // 添加或更新评论
    app.delete('/articles/:id/comments/:commentId', isLoggedIn, deleteComment); // 删除评论
};
