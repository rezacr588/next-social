import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Avatar from './ui/Avatar';

const Comments = ({ postId, initialComments = [] }) => {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);

    try {
      // Mock API call
      const comment = {
        id: Date.now().toString(),
        postId,
        userId: 'current-user',
        username: 'You',
        content: newComment,
        createdAt: new Date().toISOString(),
        likes: 0
      };

      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = (commentId) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked
        };
      }
      return comment;
    }));
  };

  return (
    <div className="mt-6">
      {/* Add Comment Form */}
      <Card className="mb-4">
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-600 text-white resize-none"
            rows="2"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !newComment.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length > 0 ? (
          comments.map(comment => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start space-x-3">
                <Avatar size="sm" alt={comment.username} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-purple-400">{comment.username}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-2">{comment.content}</p>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        comment.isLiked
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>❤️</span>
                      <span>{comment.likes}</span>
                    </button>
                    <button className="text-gray-400 hover:text-white text-sm">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-center">
            <p className="text-gray-400">No comments yet. Be the first to comment!</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Comments;
