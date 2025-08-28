// Landing.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const BASE_URL = process.env.REACT_APP_API_URL ||
  'https://myposts-server-final-41cfecfd17c4.herokuapp.com';
  // State management for the login form
  const [loginName, setLoginName] = useState('');  // User's real name for login
  const [loginPassword, setLoginPassword] = useState('');  // Password for login
  const [loginError, setLoginError] = useState('');  // Error message for invalid login

  // State management for the registration form
  const [name, setName] = useState('');  // Real name (used for login)
  const [displayName, setDisplayName] = useState('');  // Display name (shown on Main page)
  const [email, setEmail] = useState('');  // Email
  const [birthday, setBirthday] = useState('');  // Date of birth
  const [phone, setPhone] = useState('');  // Phone number
  const [zipcode, setZipcode] = useState('');  // Zipcode
  const [password, setPassword] = useState('');  // Password
  const [confirmPassword, setConfirmPassword] = useState('');  // Password confirmation

  // State for error messages
  const [errors, setErrors] = useState({});  // Error object to hold various field errors

  const navigate = useNavigate();  // For navigating between pages

  const [registeredUsers, setRegisteredUsers] = useState([]);
  // const [isRegistered, setIsRegistered] = useState(false);

  // Encapsulated data fetch function
  const fetchUsers = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/users');
      const users = await response.json();
      const userList = users.map(user => ({
        id: user.id,  // Stores user ID
        name: user.username,  // Username (used for login)
        displayName: user.name,  // User's display name
        password: user.address.street,  // Uses the street as a password for simplicity
      }));
      setRegisteredUsers(userList);  // Updates the list of registered users
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Fetch JSON Placeholder user data and map it into the registered users list
  useEffect(() => {
    fetchUsers();  // Calls the encapsulated function
  }, []);

  const handleGoogleLogin = () => {
    // 重定向到后端的 Google 登录路由
    window.location.href = `${BASE_URL}/auth/google`;
  };

  // Validates the fields in the registration form, including age check
  const validateFields = () => {
    const newErrors = {};


    const isUsernameUnique = !registeredUsers.some(user => user.name === name);
    if (!isUsernameUnique) {
      newErrors.name = 'Username already exists';
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate phone number format (assuming xxx-xxx-xxxx)
    if (!/^\d{3}-\d{3}-\d{4}$/.test(phone)) {
      newErrors.phone = 'Phone number must be in xxx-xxx-xxxx format';
    }

    // Validate zipcode format (assuming 5 digits)
    if (!/^\d{5}$/.test(zipcode)) {
      newErrors.zipcode = 'Zipcode must be 5 digits';
    }

    // Check if the user is at least 18 years old
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const isBirthdayInFutureThisYear = today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

    if (isBirthdayInFutureThisYear) {
      age--;  // Adjust age if the birthday hasn't occurred this year yet
    }

    if (age < 18) {
      newErrors.birthday = 'You must be at least 18 years old to register';
    }

    // Validate password length
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }


    setErrors(newErrors);

    // Returns true if there are no validation errors, otherwise false
    return Object.keys(newErrors).length === 0;
  };

  // Handles registration logic
  const handleRegister = async (e) => {
      e.preventDefault();
      if (!validateFields()) return;

      const newUser = {
          name,
          displayName,
          email,
          birthday,
          phone,
          zipcode,
          password,
      };

      try {
          const response = await fetch(`${BASE_URL}/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(newUser),
          });

          const data = await response.json();
          if (response.ok) {
              const user = data.user; // 获取完整的用户数据
              localStorage.setItem('loggedInUser', JSON.stringify(user)); // 存储到 localStorage
              alert('Registration successful!');
              handleReset();
          } else {
              alert(`Registration failed: ${data.error}`);
          }
      } catch (error) {
          console.error('Error during registration:', error);
      }
  };


  // Handles the login process
  const handleLogin = async (e) => {
      e.preventDefault();

      try {
          const response = await fetch(`${BASE_URL}/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // 携带 Cookie
              body: JSON.stringify({ loginName, loginPassword }),
          });

          const data = await response.json();
          console.log('Response from server:', data);
          if (response.ok) {
              const user = data.user; // 获取完整的用户数据
              localStorage.setItem('loggedInUser', JSON.stringify(user)); // 存储到 localStorage
              console.log('Login successful:', user);
              navigate('/main'); // 跳转到主界面
          } else {
              setLoginError(data.error || 'Login failed.');
          }
      } catch (error) {
          console.error('Error during login:', error);
      }
  };


  // Resets the registration form fields
  const handleReset = () => {
    setName('');
    setDisplayName('');
    setEmail('');
    setBirthday('');
    setPhone('');
    setZipcode('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1>Landing Page</h1>
      </header>

      <div className="form-wrapper">
        {/* Registration form */}
        <div className="register-container">
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <label htmlFor="name">Real Name (Username)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your real name"
              required
            />
            {errors.name && <p className="error-message">{errors.name}</p>}

            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              required
            />

            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            {errors.email && <p className="error-message">{errors.email}</p>}

            <label htmlFor="birthday">Birthday</label>
            <input
              type="date"
              id="birthday"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
            />
            {errors.birthday && <p className="error-message">{errors.birthday}</p>}

            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="123-123-1234"
              required
            />
            {errors.phone && <p className="error-message">{errors.phone}</p>}

            <label htmlFor="zipcode">Zipcode</label>
            <input
              type="text"
              id="zipcode"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              placeholder="Enter zipcode"
              required
            />
            {errors.zipcode && <p className="error-message">{errors.zipcode}</p>}

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            {errors.password && <p className="error-message">{errors.password}</p>}

            <label htmlFor="confirmPassword">Password Confirmation</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
            {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}

            <button type="submit">Register</button>
            <button type="button" onClick={handleReset}>Reset</button>
          </form>
        </div>

        {/* Login form */}
          <div className="login-container">
              <h2>Log In</h2>
              <form onSubmit={handleLogin}>
                  <label htmlFor="loginName">User Name (Real Name)</label>
                  <input
                      type="text"
                      id="loginName"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="Your user name"
                      required
                  />

                  <label htmlFor="loginPassword">Password</label>
                  <input
                      type="password"
                      id="loginPassword"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      required
                  />

                  {loginError && <p className="error-message">{loginError}</p>}

                  <button type="submit">Login</button>
              </form>
              <div className="third-party-login">
                  <h3>Or log in with</h3>
                  <button onClick={handleGoogleLogin} className="google-login-btn">
                      Log in with Google
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Landing;
