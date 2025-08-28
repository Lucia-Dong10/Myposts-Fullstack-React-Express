import React, { useState, useEffect } from 'react';
import Posts from './Posts';
import { useNavigate } from 'react-router-dom';
import './Main.css';

const Main = () => {
  const BASE_URL = process.env.REACT_APP_API_URL;
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState(localStorage.getItem('userStatus') || '');
  const [newStatus, setNewStatus] = useState('');
  const [newArticle, setNewArticle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // 存储预览URL
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const setFilteredArticles = useState([])[1];// 过滤后的文章
  const [postSearchTerm, setPostSearchTerm] = useState('');
  const [followerSearchTerm, setFollowerSearchTerm] = useState('');
  // const [allUsers, setAllUsers] = useState([]);
  const [addFollowerError, setAddFollowerError] = useState('');
  // const [loading, setLoading] = useState(true);
  const [_, setCommentCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 每页文章数量固定为10
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState(''); // 搜索关键字

  const navigate = useNavigate();

  useEffect(() => {
    const initializePage = async () => {
        try {
            await Promise.all([
                fetchArticles(),
                fetchHeadline(),
                fetchFollowingUsers()
            ]);
        } catch (error) {
            console.error('Initialization failed:', error);
        }
    };
    initializePage();
  }, []);


  const fetchHeadline = async () => {
    try {
      const response = await fetch(`${BASE_URL}/headline`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setStatus(data.headline);
    } catch (error) {
      console.error('Failed to fetch headline:', error);
    }
  };

  // 获取关注用户
  const fetchFollowingUsers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/following`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setFollowingUsers(data.following);
    } catch (error) {
      console.error('Failed to fetch following users:', error);
    }
  };


  // Load user information from localStorage
  useEffect(() => {
    const fetchUserProfile = async () => {
        try {
            // 从后端获取用户信息
            const response = await fetch(`${BASE_URL}/profile`, {
                method: 'GET',
                credentials: 'include', // 允许发送 cookies
            });

            if (!response.ok) throw new Error(`Error: ${response.status}`);

            const data = await response.json();

            // 更新状态
            setLoggedInUser({
                id: data.id,
                username: data.username,
                displayName: data.displayName || 'Unknown User',
                avatar: data.avatar || 'https://th.bing.com/th/id/OIP.akEXjXSun7zbVDGMJUegdgHaHa?w=650&h=650&rs=1&pid=ImgDetMain',
            });

            // 同步到 localStorage
            localStorage.setItem('loggedInUser', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            navigate('/'); // 如果未登录，跳转到登录页面
        }
    };

    fetchUserProfile(); // 调用后端获取用户信息
  }, [navigate]);



  // Handle adding a new follower, temporarily displaying articles without persistence
  const handleAddFollower = async (e) => {
    e.preventDefault();
    if (!followerSearchTerm.trim()) {
        setAddFollowerError("Please enter a username to follow.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/following`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: followerSearchTerm }),
        });



        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 404) {
                setAddFollowerError(errorData.error || "No user found. Please enter a correct display name or username.");
            } else if (response.status === 400) {
                setAddFollowerError(errorData.error || "You cannot follow yourself or are already following this user.");
            } else {
                setAddFollowerError("An error occurred while adding the follower.");
            }
            return;
        }

        const data = await response.json();

        // 为缺少的字段设置默认值
        const updatedFollowing = data.following.map((user) => ({
            username: user.username,
            displayName: user.displayName || "Unknown User",
            avatar: user.avatar || "https://via.placeholder.com/100",
            headline: user.headline || "No headline available",
        }));

        setFollowingUsers(data.following);
        setFollowerSearchTerm('');
        setAddFollowerError(''); // 清除错误提示
        await fetchFollowingUsers();
        await fetchArticles();
    } catch (error) {
        console.error('Failed to add follower:', error);
        setAddFollowerError("An unexpected error occurred.");
    }
  };



  // Remove a follower and their articles temporarily
  const handleRemoveFollower = async (username) => {
    if (!username) {
        console.error("Username is undefined. Cannot remove follower.");
        alert("Invalid user specified.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/following/${username}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error removing follower:', errorData.error || response.statusText);
            alert(errorData.error || "Failed to remove follower. Please try again.");
            return;
        }

        //const data = await response.json();

        // 更新前端 followingUsers 列表
        setFollowingUsers((prev) => prev.filter((user) => user.username !== username));
        await fetchFollowingUsers();
        await fetchArticles();
    } catch (error) {
        console.error('Failed to remove follower:', error);
        alert("An unexpected error occurred while removing the follower.");
    }
  };



  // Update user status and persist in localStorage
  const handleUpdateStatus = async () => {
    if (!newStatus) return;

    try {
        const response = await fetch(`${BASE_URL}/headline`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ headline: newStatus }),
        });
        const data = await response.json();
        setStatus(data.headline);
        setNewStatus('');
    } catch (error) {
        console.error('Failed to update status:', error);
    }
  };

  // 发布文章
  const handlePostArticle = async () => {
    if (!newArticle.trim()) {
        alert('Article text cannot be empty.');
        return;
    }

    const formData = new FormData();
    formData.append('title', newTitle); // 添加标题
    formData.append('body', newArticle); // 添加内容

    if (image) {
        if (!(image instanceof File)) {
            console.error('Invalid image file:', image);
            alert('Please select a valid image file.');
            return;
        }
        formData.append('image', image); // Attach the image file
    }

    try {
        const response = await fetch(`${BASE_URL}/articles`, {
            method: 'POST',
            credentials: 'include',
            body: formData, // Use FormData for file uploads
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error posting article:', errorData.error || response.statusText);
            alert(errorData.error || 'Failed to post article.');
            return;
        }

        const data = await response.json();
        setArticles((prevArticles) => [data.articles[0], ...prevArticles]);
        setNewArticle(''); // Clear the article input
        setImage(null); // Clear the image file
    } catch (error) {
        console.error('Failed to post article:', error);
        alert('An unexpected error occurred while posting the article.');
    }
  };




  // Function to handle search input changes for filtering articles
    const handlePostSearch = async (e) => {
        const searchTerm = e.target.value; // 获取输入框值并转为小写
        setPostSearchTerm(searchTerm); // 更新状态

        // 每次搜索从第一页开始
        await fetchArticles(1, pageSize, searchTerm);
    };



  // Function to handle search input changes for followers
  const handleFollowerSearch = (e) => {
    setFollowerSearchTerm(e.target.value);
  };

  // Function to handle image file upload for a new post
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const previewUrl = URL.createObjectURL(file); // 创建预览URL
        setImage(file); // 存储文件对象
        setImagePreview(previewUrl); // 存储预览URL
    }
  };

  const onAddComment = async (articleId, commentText) => {
    try {
        const response = await fetch(`${BASE_URL}/articles/${articleId}/comments`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: commentText}),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add comment.');
        }

        const updatedArticle = await response.json();

        // 更新 `articles` 和 `filteredArticles`
        setArticles((prevArticles) =>
            prevArticles.map((article) =>
                article._id === updatedArticle._id ? updatedArticle : article
            )
        );

        setFilteredArticles((prevFiltered) =>
            prevFiltered.map((article) =>
                article._id === updatedArticle._id ? updatedArticle : article
            )
        );

        return updatedArticle; // 返回更新后的文章给 PostItem

    } catch (error) {
        console.error('Failed to add comment:', error);
        alert('An error occurred while adding the comment.');
        throw error;
    }
  };

  const handleEditArticle = async (articleId, updatedBody) => {
      try {
        const response = await fetch(`${BASE_URL}/articles/${articleId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: updatedBody }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update the article.');
        }

        await fetchArticles(); // 刷新文章列表
      } catch (error) {
        console.error('Failed to update article:', error);
      }
  };

  const handleEditComment = async (articleId, commentId, updatedText) => {
      try {
        const response = await fetch(`${BASE_URL}/articles/${articleId}/comments`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: updatedText, commentId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update the comment.');
        }

        await fetchArticles(); // 刷新文章列表
      } catch (error) {
        console.error('Failed to update comment:', error);
      }
  };

  const handleDeleteComment = async (articleId, commentId) => {
      try {
        const response = await fetch(`${BASE_URL}/articles/${articleId}/comments/${commentId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete the comment.');
        }

        await fetchArticles(); // 刷新文章列表
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
  };




  // Filter articles by author or body (excluding date/id)
    const fetchArticles = async (page = 1, limit = 10, search = '') => {
        console.log('Fetching articles with:', { page, limit, search });
        try {
            // 构建查询参数
            let query = `?page=${page}&limit=${limit}`;
            if (search) {
                query += `&search=${encodeURIComponent(search)}`;
            }

            // 发起请求
            const response = await fetch(`${BASE_URL}/articles${query}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) throw new Error(`Error: ${response.status}`);

            const data = await response.json();
            console.log('Fetched data:', data);

            // 直接使用后端返回的文章列表和分页信息
            setArticles(data.articles); // 当前页文章
            setTotalArticles(data.total); // 总文章数（从后端返回的 total）
            setCurrentPage(page); // 当前页
            setTotalPages(Math.ceil(data.total / limit)); // 总页数

            // 计算所有文章的评论总数
            const totalComments = data.articles.reduce(
                (acc, article) => acc + (article.comments?.length || 0),
                0
            );
            // console.log(`Total comments: ${totalComments}`);
            setCommentCount(totalComments); // 更新评论总数
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        }
    };

    useEffect(() => {
        // 初始加载文章
        fetchArticles(currentPage, pageSize, postSearchTerm);
    }, [currentPage, pageSize, postSearchTerm]);

    // 分页导航
    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
    };




  if (!loggedInUser) {
    return <div>Loading...</div>;
  }

    return (
      <div className="main-page">
        <div className="sidebar">
          <div className="nav-buttons">
            <button onClick={() => navigate('/profile')}>Edit Profile</button>
            <button
              onClick={() => {
                localStorage.clear(); // 清理本地存储并跳转到登录页面
                navigate('/');
              }}
            >
              Log Out
            </button>
          </div>

          <div className="profile-section">
            {loggedInUser ? (
              <>
                <img
                  src={loggedInUser.avatar || 'https://via.placeholder.com/100'}
                  alt="User avatar"
                  className="profile-image"
                />
                <h3>{loggedInUser.displayName || 'Unknown User'}</h3>
                <p>{status || 'No status available'}</p>
                <input
                  type="text"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="New Status"
                  className="status-input"
                />
                <button onClick={handleUpdateStatus}>Update</button>
              </>
            ) : (
              <p>Loading user information...</p>
            )}

            <div className="following-section">
              <h4>Following Users</h4>
              <form className="add-user-section" onSubmit={handleAddFollower}>
                <input
                  type="text"
                  value={followerSearchTerm}
                  onChange={handleFollowerSearch}
                  placeholder="Enter display name or username"
                  className="add-user-input"
                  data-testid="add-follower-input"
                />
                <button type="submit" className="add-user-btn" data-testid="add-follower-btn">
                  Add
                </button>
              </form>
              {addFollowerError && <p className="error-message">{addFollowerError}</p>}

              {followingUsers && followingUsers.length > 0 ? (
                followingUsers.map((user) => (
                  <div key={user.id} className="following-user">
                    <img
                      src={user.avatar || 'https://via.placeholder.com/100'}
                      alt={user.displayName || 'User'}
                      className="following-user-image"
                    />
                    <div className="following-user-details">
                      <p className="following-name">{user.displayName || 'Unknown'}</p>
                      <p className="following-status">{user.headline || 'No status available'}</p>
                    </div>
                    <button className="unfollow-btn" onClick={() => handleRemoveFollower(user.username)}>
                      Unfollow
                    </button>
                  </div>
                ))
              ) : (
                <p>No following users found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="post-section">
          <h2>New post</h2>
          <form>
            <input type="file" onChange={handleImageUpload} data-testid="file-upload" />
            {image && <img src={imagePreview} alt="Preview" className="preview-image" />}
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="title-input"
            />
            <textarea
              value={newArticle}
              onChange={(e) => setNewArticle(e.target.value)}
              placeholder="Share something interesting!"
              className="article-input"
            />
            <div className="post-buttons">
              <button type="button" onClick={handlePostArticle}>
                Post
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewArticle('');
                  setNewTitle('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          <h2>All posts</h2>
          <input
            type="text"
            value={postSearchTerm}
            onChange={handlePostSearch}
            placeholder="Search posts here..."
            className="post-search-input"
          />
          {articles && articles.length > 0 ? (
            <>
              <Posts
                articles={articles} // 传递当前页的文章
                onAddComment={onAddComment}
                fetchArticles={fetchArticles}
                onEditArticle={handleEditArticle}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />

              {/* Pagination Controls */}
              <div className="pagination">
                <button
                    onClick={prevPage}
                    disabled={currentPage === 1} // 禁用“上一页”按钮，如果在第一页
                    className="pagination-button"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages || 1} {/* 确保 totalPages 存在，避免 NaN */}
                </span>
                <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages} // 禁用“下一页”按钮，如果在最后一页
                    className="pagination-button"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p>No articles found.</p>
          )}
        </div>
      </div>
    );


};

export default Main;
