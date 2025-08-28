const request = require('supertest');
const mongoose = require('mongoose');
const { User } = require('../models/User');
const { Article } = require('../models/Article');
const app = require('../index');
const md5 = require('md5');

let server; // 测试服务器实例
const PORT = 3008; // 测试服务器端口

// 测试用户数据
const testUser = {
    username: 'testuser',
    displayName: 'Test User',
    email: 'testuser@example.com',
    birthday: '1990-01-01',
    phone: '1234567890',
    zipcode: '12345',
    password: 'password',
};

// 测试文章数据
const testArticle = {
    title: 'Test Article',
    body: 'This is a test article.',
};

// 全局变量存储 Cookie
let testCookie = '';

// 测试前准备：清理数据库和创建测试用户
beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    await User.deleteMany({});
    await Article.deleteMany({});

    // 创建测试用户
    const salt = md5(testUser.username + new Date().getTime());
    const hash = md5(testUser.password + salt);
    await User.create({
        username: testUser.username,
        displayName: testUser.displayName,
        email: testUser.email,
        birthday: testUser.birthday,
        phone: testUser.phone,
        zipcode: testUser.zipcode,
        salt,
        hash,
    });

    server = app.listen(PORT, () => console.log(`Test server running on port ${PORT}`));

    // 模拟登录
    const loginRes = await request(server).post('/login').send({
        loginName: testUser.username,
        loginPassword: testUser.password,
    });

    // 保存 Cookie
    testCookie = loginRes.headers['set-cookie']?.[0];
    if (!testCookie) {
        throw new Error('Failed to retrieve set-cookie header from login response');
    }
});

// 测试后清理：关闭数据库连接和服务器
afterAll(async () => {
    await User.deleteMany({});
    await Article.deleteMany({});
    await mongoose.connection.close();
    if (server) {
        server.close();
    }
});

// 测试获取文章
describe('GET /articles/:id?', () => {
    it('should return all articles for the user and their following', async () => {
        const res = await request(server).get('/articles').set('Cookie', testCookie);
        expect(res.statusCode).toBe(404); // 初始情况下没有文章
        expect(res.body.error).toBe('No articles found');
    });

    it('should return a specific article by ID', async () => {
        const article = await Article.create({
            title: testArticle.title,
            body: testArticle.body,
            author: testUser.username,
            comments: [],
        });

        const res = await request(server).get(`/articles/${article._id}`).set('Cookie', testCookie);
        expect(res.statusCode).toBe(200);
        expect(res.body.articles[0].title).toBe(testArticle.title);
    });
});

// 测试创建文章
describe('POST /article', () => {
    it('should create a new article', async () => {
        const res = await request(server)
            .post('/article')
            .set('Cookie', testCookie)
            .send(testArticle);

        expect(res.statusCode).toBe(201);
        expect(res.body.articles[0].title).toBe(testArticle.title);

        const article = await Article.findOne({ title: testArticle.title });
        expect(article).not.toBeNull();
    });

    it('should return 400 if title or body is missing', async () => {
        const res = await request(server)
            .post('/article')
            .set('Cookie', testCookie)
            .send({ title: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Title and body are required');
    });
});

// 测试更新文章
describe('PUT /articles/:id', () => {
    it('should update an article', async () => {
        const article = await Article.create({
            title: 'Old Title',
            body: 'Old body',
            author: testUser.username,
            comments: [],
        });

        const res = await request(server)
            .put(`/articles/${article._id}`)
            .set('Cookie', testCookie)
            .send({ text: 'Updated body' });

        expect(res.statusCode).toBe(200);
        expect(res.body.body).toBe('Updated body'); // 确认返回的文章内容

        const updatedArticle = await Article.findById(article._id);
        expect(updatedArticle.body).toBe('Updated body'); // 确认数据库中内容更新
    });
});

describe('PUT /articles/:id/comments', () => {
    it('should add a comment to an article', async () => {
        const article = await Article.create({
            title: testArticle.title,
            body: testArticle.body,
            author: testUser.username,
            comments: [],
        });

        const res = await request(server)
            .put(`/articles/${article._id}/comments`)
            .set('Cookie', testCookie)
            .send({ text: 'This is a comment' });

        console.log(res.body); // 查看返回的结构

        expect(res.statusCode).toBe(200);
        expect(res.body.article.comments.length).toBe(1); // 根据实际结构调整路径
        expect(res.body.article.comments[0].text).toBe('This is a comment'); // 确认评论内容
    });


    it('should return 400 if comment text is missing', async () => {
        const article = await Article.create({
            title: testArticle.title,
            body: testArticle.body,
            author: testUser.username,
            comments: [],
        });

        const res = await request(server)
            .put(`/articles/${article._id}/comments`)
            .set('Cookie', testCookie)
            .send({ text: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Comment text is required');
    });
});

