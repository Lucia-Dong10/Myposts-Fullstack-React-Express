import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import React from 'react';
import axios from 'axios';

const Profile = () => {
  const BASE_URL = process.env.REACT_APP_API_URL;
  // State to manage profile data (loaded from localStorage or fetched from API)
  const [profileData, setProfileData] = useState({
    username: '',
    displayName: '',
    email: '',
    phone: '',
    zipcode: '',
    avatar: '',
    password: '',
    auth: [], // To manage linked accounts
  });

  const [newProfileData, setNewProfileData] = useState({});
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');
  //const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [emptyInputMessage, setEmptyInputMessage] = useState(''); // 管理空输入的消息


  // 从后端获取用户数据
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/profile`, {
          method: 'GET',
          credentials: 'include', // 确保 cookies 被发送
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Profile Data:', data);


        setProfileData(data);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
        navigate('/');
      }
    };


    fetchProfileData();
  }, [navigate]);


  // Field validation for the profile form
  const validateFields = () => {
    const newErrors = {};
    const { email, phone, zipcode, password, passwordConfirmation } = newProfileData;

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate phone number format (xxx-xxx-xxxx)
    if (phone && !/^\d{3}-\d{3}-\d{4}$/.test(phone)) {
      newErrors.phone = 'Phone number must be in xxx-xxx-xxxx format';
    }

    // Validate zipcode (5 digits)
    if (zipcode && !/^\d{5}$/.test(zipcode)) {
      newErrors.zipcode = 'Zipcode must be 5 digits';
    }

    // Validate password length
    if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Ensure new password is different from the current one
    if (password && password === profileData.password) {
      newErrors.password = 'New password cannot be the same as the old password';
    }

    // Check if passwords match
    if (password && password !== passwordConfirmation) {
      newErrors.password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes for new profile data
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file upload and store the avatar temporarily
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const imgDataUrl = event.target.result;
            console.log('Generated Base64:', imgDataUrl); // Log the Base64 string
            setTempAvatar(imgDataUrl);  // Temporarily store uploaded image
        };
        reader.readAsDataURL(file); // Convert the file to a Base64 string
    } else {
        console.error('No file selected.');
    }
  };


  // Handle profile picture update
  // 上传头像到后端
  const handleAvatarUpdate = async () => {
    if (!tempAvatar) {
      alert('Please upload a picture first.');
      return;
    }
    console.log('Sending avatar to server:', tempAvatar);

    try {
      const response = await fetch(`${BASE_URL}/avatar`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: tempAvatar }),
      });

      // 检查响应状态码
      if (response.status === 413) {
        alert('File size exceeds the 5MB limit. Please upload a smaller file.');
        return;
      }

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const updatedData = await response.json();
      setProfileData(updatedData);
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Failed to update avatar:', error);
      alert('An error occurred while updating the profile picture.');
    }
  };

  // 更新用户数据到后端
  const handleUpdateProfile = async () => {
    if (!Object.values(newProfileData).some(value => value !== '' && value !== undefined)) {
        setEmptyInputMessage('No information input!');
        return;
    }

    if (!validateFields()) return;

    const filteredData = Object.fromEntries(
        Object.entries(newProfileData).filter(([_, value]) => value !== '' && value !== undefined)
    );

    console.log('New profile data being sent:', filteredData);

    try {
        const response = await fetch(`${BASE_URL}/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filteredData),
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const updatedData = await response.json();
        console.log('Updated profile data:', updatedData);

        setProfileData(updatedData.user || updatedData);
        setNewProfileData({});
        setSuccessMessage('Profile updated successfully!');

        setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('Failed to update profile. Please try again.');
    }
  };



  const handleUnlinkAccount = async (provider) => {
    if (!provider) {
        alert('Provider is required to unlink account');
        return;
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/unlink-account`,
            { provider }, // 请求体传递 provider
            { withCredentials: true } // 确保包含会话信息
        );

        // 检查响应数据
        if (!response.data || !response.data.user || !Array.isArray(response.data.user.auth)) {
            console.error('Invalid response:', response.data);
            throw new Error('Failed to unlink account');
        }

        // 更新状态
        setProfileData((prev) => ({
            ...prev,
            auth: response.data.user.auth, // 更新 auth 数组
        }));

        alert('Account unlinked successfully!');
    } catch (error) {
        console.error('Error unlinking account:', error);
        const errorMessage =
            (error.response && error.response.data && error.response.data.error) ||
            'Failed to unlink account';
        alert(errorMessage);
    }
  };

  const handleGoogleLink = async () => {
    try {
        // 确保提供 provider 参数
        const response = await axios.post(
            `${BASE_URL}/link-account`,
            { provider: 'google' }, // 提供 provider 参数
            { withCredentials: true } // 携带会话信息
        );

        // 检查响应数据
        const data = response.data;

        if (!data.user || !Array.isArray(data.user.auth)) {
            console.error('Invalid response:', data);
            throw new Error('Failed to retrieve linked account information');
        }

        // 查找是否存在 Google 的认证信息
        const googleAuth = data.user.auth.find((auth) => auth.provider === 'google');

        if (googleAuth) {
            console.log('Google account linked:', googleAuth);
            alert('Google account linked successfully!');
        } else {
            console.log('No Google account linked yet.');
            alert('No Google account linked.');
        }
    } catch (error) {
        console.error('Error linking Google account:', error);
        const errorMessage =
            error.response?.data?.error || error.message || 'Failed to link Google account';
        alert(errorMessage);
    }
  };







  // Handle form reset
  const handleReset = () => {
    setNewProfileData({
      displayName: '',
      email: '',
      phone: '',
      zipcode: '',
      password: '',
      passwordConfirmation: '',
    });
    setErrors({}); // 清空错误信息
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Section to display current user information */}
        <div className="profile-info">
          <h3>Current Information</h3>
          <img src={tempAvatar || profileData.avatar} alt="Profile" className="profile-picture"/>
          <button className="upload-btn" onClick={handleAvatarUpdate}>Upload Profile Picture</button>
          <input type="file" onChange={handleFileUpload} data-testid="file-upload"/>

          {/* Display current profile data */}
          <div className="info-field">
            <label>Username:</label>
            <p>{profileData.username}</p>
          </div>

          <div className="info-field">
            <label>Display Name:</label>
            <p>{profileData.displayName}</p>
          </div>

          <div className="info-field">
            <label>Email:</label>
            <p>{profileData.email}</p>
          </div>

          <div className="info-field">
            <label>Phone number:</label>
            <p>{profileData.phone}</p>
          </div>

          <div className="info-field">
            <label>ZipCode:</label>
            <p>{profileData.zipcode}</p>
          </div>

          <div className="info-field">
            <label>Password:</label>
            <p>{profileData.password ? '*'.repeat(profileData.password.length) : 'No password set'}</p>
          </div>

          <ul>
            {/* 检查 profileData.auth 是否存在，避免 undefined 错误 */}
            {(profileData.auth || []).map((account, index) => (
                <li key={index}>
                  {/* 显示 provider 和 email */}
                  <span>
                    Linked Account: {account.provider} {account.email ? `(${account.email})` : ''}
                  </span>
                  <button onClick={() => handleUnlinkAccount(account.provider)} style={{marginLeft: '10px'}}>
                    Unlink
                  </button>
                </li>
            ))}
          </ul>

          {/*/!* 添加按钮以链接 Google 账号 *!/*/}
          {/*<button onClick={() => handleGoogleLink('google')} style={{marginTop: '10px'}}>*/}
          {/*  Link Google Account*/}
          {/*</button>*/}


          <div className="back-link">
            <button
                onClick={() => {
                  localStorage.removeItem('loggedInAvatar');
                  navigate('/main');
                }} className="back-btn"
            >
              Back to Main Page
            </button>
          </div>
        </div>

        {/* Form to update user information */}
        <div className="profile-update">
        <h3>Update information</h3>

          <form>
            <label>Display Name</label>
            <input
                type="text"
                name="displayName"
                onChange={handleChange}
                placeholder="New display name"
                value={newProfileData.displayName || ''}
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              onChange={handleChange}
              placeholder="New email"
              value={newProfileData.email || ''}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}

            <label>Phone</label>
            <input
              type="text"
              name="phone"
              onChange={handleChange}
              placeholder="New phone"
              value={newProfileData.phone || ''}
            />
            {errors.phone && <p className="error-message">{errors.phone}</p>}

            <label>ZipCode</label>
            <input
              type="text"
              name="zipcode"
              onChange={handleChange}
              placeholder="New zipcode"
              value={newProfileData.zipcode || ''}
            />
            {errors.zipcode && <p className="error-message">{errors.zipcode}</p>}

            <label>Password</label>
            <input
              type="password"
              name="password"
              onChange={handleChange}
              placeholder="New password"
              value={newProfileData.password || ''}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}

            <label>Password Confirmation</label>
            <input
              type="password"
              name="passwordConfirmation"
              onChange={handleChange}
              placeholder="Confirm new password"
              value={newProfileData.passwordConfirmation || ''}
            />

            <div className="update-buttons">
              <button type="button" onClick={handleUpdateProfile}>Update</button>
              <button type="button" onClick={handleReset}>Reset</button>
            </div>
            {successMessage && <p className="error-message">{successMessage}</p>}
            {emptyInputMessage && <p className="error-message">{emptyInputMessage}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
