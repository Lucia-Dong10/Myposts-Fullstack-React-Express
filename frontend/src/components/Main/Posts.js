import React, { useState } from 'react';
import './Posts.css';


const Posts = ({ articles, onAddComment, fetchArticles }) => {
  const BASE_URL = process.env.REACT_APP_API_URL;
  return (
    <div className="posts-container">
      {articles.length === 0 ? (
        // 如果没有文章，显示消息
        <p>No articles to display</p>
      ) : (
        articles.map((article) => (
          <PostItem
              key={article._id || article.id}
              article={article}
              onAddComment={onAddComment}
              fetchArticles={fetchArticles}
          />
        ))
      )}
    </div>
  );
};

const PostItem = ({ article, onAddComment, fetchArticles }) => {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')); // 解析用户数据
  const currentUsername = loggedInUser?.username; // 获取当前用户名

  // console.log('Author:', article.author);
  // console.log('Current Username:', currentUsername);

  const BASE_URL = process.env.REACT_APP_API_URL;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(article.body || '');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');


  const handleAddComment = async () => {
    if (!commentText.trim()) {
      alert('Comment cannot be empty.');
      return;
    }

    try {
      const updatedArticle = await onAddComment(article._id, commentText);

      if (updatedArticle || updatedArticle.comments) {
        setShowComments(true);
        await fetchArticles();
      }

      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('An error occurred while adding the comment.');
    }
  };

  const handleEditArticle = async () => {
    try {
      const response = await fetch(`${BASE_URL}/articles/${article._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedBody }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update article.');
      }

      setIsEditing(false);
      await fetchArticles();
    } catch (error) {
      console.error('Failed to update article:', error);
      alert(error.message || 'An error occurred while updating the article.');
    }
  };

  const handleEditComment = async () => {
    try {
      const response = await fetch(`${BASE_URL}/articles/${article._id}/comments`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingCommentText, commentId: editingCommentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update comment.');
      }

      setEditingCommentId(null);
      setEditingCommentText('');
      await fetchArticles();
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert(error.message || 'An error occurred while updating the comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/articles/${article._id}/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment.');
      }

      await fetchArticles();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert(error.message || 'An error occurred while deleting the comment.');
    }
  };

  return (
    <div className="post">
      <div className="post-header">
        <h3>{article.title || 'Untitled Article'}</h3>

        {/* 编辑按钮，放在标题的右上角 */}
        {article.author === currentUsername && (
          <button
            className="edit-article-btn"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      <div className="post-meta">
        <p>
          By {article.author || 'Anonymous'} on{' '}
          {new Date(article.timestamp || Date.now()).toLocaleString()}
        </p>
      </div>

      {isEditing ? (
        <>
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={4}
          />
          <button onClick={handleEditArticle}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </>
      ) : (
        <p>{article.body || 'No content available for this article.'}</p>
      )}

      {article.image && (
        <img
          src={`${article.image}`}
          alt="Uploaded"
          className="post-image"
        />
      )}

      <div className="comment-input">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
        />
        <button onClick={handleAddComment}>Add Comment</button>
      </div>

      <div className="post-actions">
        <button onClick={() => setShowComments(!showComments)}>
          {showComments ? 'Hide Comments' : 'Show Comments'}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {article.comments && article.comments.length > 0 ? (
            article.comments.map((comment) => (
              <div key={comment._id} className="comment">
                <img
                  src={comment.avatar || 'https://via.placeholder.com/50'}
                  alt="Avatar"
                  className="comment-avatar"
                />
                <div className="comment-details">
                  <p className="comment-author">
                    <strong>{comment.author}</strong>{' '}
                    <span className="comment-timestamp">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </p>
                  {editingCommentId === comment._id ? (
                    <>
                      <textarea
                        value={editingCommentText}
                        onChange={(e) =>
                          setEditingCommentText(e.target.value)
                        }
                      />
                      <button onClick={handleEditComment}>Save</button>
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentText('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <p className="comment-text">{comment.text}</p>
                  )}
                </div>

                {comment.author === currentUsername && (
                  <div className="comment-actions">
                    <button
                      onClick={() => {
                        setEditingCommentId(comment._id);
                        setEditingCommentText(comment.text);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );

};

export default Posts;
