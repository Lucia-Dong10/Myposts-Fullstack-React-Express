const request = require('supertest');
const mongoose = require('mongoose');
const { User } = require('../models/User');
const app = require('../index');
const md5 = require('md5');

let server;
const PORT = 3007;

const testUser = {
    username: 'testUser_x',
    displayName: 'Test User',
    email: 'testuser@example.com',
    phone: '1234567890',
    zipcode: '12345',
    password: 'password',
    headline: 'This is a test headline!',
    avatar: 'https://via.placeholder.com/50',
};

let testCookie = '';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    server = app.listen(PORT, () => console.log(`Test server running on port ${PORT}`));
});

beforeEach(async () => {
    await User.deleteMany(); // 清空用户集合

    // 检查用户是否已存在
    const existingUser = await User.findOne({ username: testUser.username });
    if (!existingUser) {
        const salt = md5(testUser.username + new Date().getTime());
        const hash = md5(testUser.password + salt);
        await User.create({
            ...testUser,
            salt,
            hash,
        });
    }

    const loginRes = await request(server)
        .post('/login')
        .send({ loginName: testUser.username, loginPassword: testUser.password });

    console.log('Login Response:', loginRes.body);
    console.log('Set-Cookie:', loginRes.headers['set-cookie']);

    testCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : null;
    if (!testCookie) {
        throw new Error('Failed to retrieve set-cookie header from login response');
    }
});



afterAll(async () => {
    await mongoose.connection.close();
    if (server) server.close();
});

describe('Profile API Tests', () => {
    // Test for headline
    describe('GET /headline/:user?', () => {
        it('should return the headline for the logged-in user', async () => {
            const res = await request(server)
                .get('/headline')
                .set('Cookie', testCookie);

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.headline).toBe(testUser.headline);
        });

        it('should return 404 for a non-existent user', async () => {
            const res = await request(server)
                .get('/headline/nonexistentuser')
                .set('Cookie', testCookie);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User not found');
        });
    });

    describe('PUT /headline', () => {
        it('should update the headline for the logged-in user', async () => {
            const newHeadline = 'Updated headline!';
            const res = await request(server)
                .put('/headline')
                .set('Cookie', testCookie)
                .send({ headline: newHeadline });

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.headline).toBe(newHeadline);
        });

        it('should return 400 if headline is missing', async () => {
            const res = await request(server)
                .put('/headline')
                .set('Cookie', testCookie)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Headline is required');
        });
    });

    // Test for avatar
    describe('GET /avatar/:user?', () => {
        it('should return the avatar for the logged-in user', async () => {
            const res = await request(server)
                .get('/avatar')
                .set('Cookie', testCookie);

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.avatar).toBe(testUser.avatar);
        });

        it('should return 404 for a non-existent user', async () => {
            const res = await request(server)
                .get('/avatar/nonexistentuser')
                .set('Cookie', testCookie);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User not found');
        });
    });

    describe('PUT /avatar', () => {
        it('should update the avatar for the logged-in user', async () => {
            const newAvatar = 'https://via.placeholder.com/100';
            const res = await request(server)
                .put('/avatar')
                .set('Cookie', testCookie)
                .send({ avatar: newAvatar });

            expect(res.statusCode).toBe(200);
            expect(res.body.avatar).toBe(newAvatar);
        });

        it('should return 400 if avatar is missing', async () => {
            const res = await request(server)
                .put('/avatar')
                .set('Cookie', testCookie)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Avatar is required');
        });
    });

    // Test for email
    describe('PUT /email', () => {
        it('should update the email for the logged-in user', async () => {
            const newEmail = 'newemail@example.com';
            const res = await request(server)
                .put('/email')
                .set('Cookie', testCookie)
                .send({ email: newEmail });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.email).toBe(newEmail);
        });

        it('should return 400 if email is missing', async () => {
            const res = await request(server)
                .put('/email')
                .set('Cookie', testCookie)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('At least one field must be provided to update');
        });
    });

    // Add similar tests for phone and zipcode
    describe('PUT /phone', () => {
        it('should update the phone for the logged-in user', async () => {
            const newPhone = '9876543210';
            const res = await request(server)
                .put('/phone')
                .set('Cookie', testCookie)
                .send({ phone: newPhone });

            console.log('PUT /phone Response:', res.body);

            expect(res.statusCode).toBe(200);
            expect(res.body.user.phone).toBe(newPhone);
        });
    });

    describe('PUT /zipcode', () => {
        it('should update the zipcode for the logged-in user', async () => {
            const newZipcode = '54321';
            const res = await request(server)
                .put('/zipcode')
                .set('Cookie', testCookie)
                .send({ zipcode: newZipcode });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.zipcode).toBe(newZipcode);
        });
    });
});
