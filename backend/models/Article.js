const mongoose = require('mongoose');

// Define the schema for an article
const ArticleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, // 文章标题为必填项
    },
    body: {
        type: String,
        required: true, // 文章内容为必填项
    },
    image: {
        type: String,
        default: null, // Optional field for storing image URLs
    },
    author: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now, // Automatically set to current date/time
    },
    comments: [
        {
            text: {
                type: String,
                required: true,
            },
            author: {
                type: String,
                required: true,
            },
            avatar: {
                type: String,
                default: 'https://via.placeholder.com/50',
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

// Create the Article model
const Article = mongoose.model('Article', ArticleSchema);

module.exports = { Article };
