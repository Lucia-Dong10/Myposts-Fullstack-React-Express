const request = require('supertest');
const mongoose = require('mongoose');
const { User } = require('../models/User');
const app = require('../index');

let server; // 存储测试期间启动的服务器实例
const PORT = 3009; // 测试端口

// 测试数据
const testUser = {
    name: 'joey_test',
    displayName: 'Joey Tribbiani',
    email: 'joey@example.com',
    birthday: '1990-01-01',
    phone: '1234567890',
    zipcode: '12345',
    password: 'password',
};

// 在所有测试前清理数据库和启动测试服务器
beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    await User.deleteMany({});
    server = app.listen(PORT, () => console.log(`Test server running on port ${PORT}`));
});

// 在所有测试后关闭数据库和测试服务器
afterAll(async () => {
    await mongoose.connection.close();
    server.close();
});

// 测试注册功能
describe('POST /register', () => {
    it('should register a new user successfully', async () => {
        const res = await request(server).post('/register').send(testUser);
        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe('success');
        expect(res.body.user.username).toBe(testUser.name);

        const user = await User.findOne({ username: testUser.name });
        expect(user).not.toBeNull();
        expect(user.email).toBe(testUser.email);
    });

    it('should return 400 if username already exists', async () => {
        const res = await request(server).post('/register').send(testUser);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Username already exists');
    });
});

// 测试登录功能
describe('POST /login', () => {
    it('should log in a user successfully and set a cookie', async () => {
        const res = await request(server)
            .post('/login')
            .send({ loginName: testUser.name, loginPassword: testUser.password });
        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe('success');
        expect(res.body.user.username).toBe(testUser.name);
    });

    it('should return 401 for incorrect password', async () => {
        const res = await request(server)
            .post('/login')
            .send({ loginName: testUser.name, loginPassword: 'wrongpassword' });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid username or password');
    });

    it('should return 401 for non-existent user', async () => {
        const res = await request(server)
            .post('/login')
            .send({ loginName: 'nonexistent', loginPassword: 'password' });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid username or password');
    });
});

// 测试注销功能
describe('PUT /logout', () => {
    it('should log out a user successfully', async () => {
        const loginRes = await request(server)
            .post('/login')
            .send({ loginName: testUser.name, loginPassword: testUser.password });
        const cookie = loginRes.headers['set-cookie'];

        const res = await request(server).put('/logout').set('Cookie', cookie);
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('OK');
    });
});
