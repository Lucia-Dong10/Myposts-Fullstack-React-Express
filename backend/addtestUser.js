const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // 从 backend/.env 读取


const mongoose = require('mongoose');
const { User } = require('./models/User');
const md5 = require('md5');

// MongoDB connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const createTestUser = async () => {
    const username = 'joey_test';
    const password = 'password';
    const salt = md5(username + new Date().getTime());
    const hash = md5(password + salt);

    const user = new User({
        username: 'joey_test',
        displayName: 'Joey Tribbiani',
        email: 'joey@example.com',
        phone: '1234567890',
        zipcode: '12345',
        salt,
        hash,
        headline: 'How you doin\'?',
        avatar: 'https://via.placeholder.com/150',
    });

    await user.save();
    console.log('Test user created successfully');
    mongoose.connection.close();
};

createTestUser();
