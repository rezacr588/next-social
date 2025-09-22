import React, { useState } from 'react';
import MediaViewer from './MediaViewer';
import Card from './ui/Card';
import Avatar from './ui/Avatar';
import Comments from './Comments';

const Post = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [interactions, setInteractions] = useState({
    likes: post.like_count || 0,
    shares: post.share_count || 0,
    saves: 0,
    isLiked: false,
    isShared: false,
    isSaved: false
  });

  const handleInteraction = (type) => {
    setInteractions(prev => {
      const newState = { ...prev };

      switch (type) {
        case 'like':
          newState.likes = prev.isLiked ? prev.likes - 1 : prev.likes + 1;
          newState.isLiked = !prev.isLiked;
          break;
        case 'share':
          newState.shares = prev.isShared ? prev.shares - 1 : prev.shares + 1;
          newState.isShared = !prev.isShared;
          break;
        case 'save':
          newState.saves = prev.isSaved ? prev.saves - 1 : prev.saves + 1;
          newState.isSaved = !prev.isSaved;
          break;
      }

      return newState;
    });
  };

  const mockComments = [
    {
      id: '1',
      postId: post.id,
      userId: 'user1',
      username: 'Alice',
      content: 'Great post! Thanks for sharing.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      likes: 2,
      isLiked: false
    },
    {
      id: '2',
      postId: post.id,
      userId: 'user2',
      username: 'Bob',
      content: 'Very informative! 👍',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      likes: 1,
      isLiked: false
    }
  ];

  return (
    <Card>
      <div className="flex items-center mb-4">
        <Avatar alt={post.username} />
        <div className="ml-4">
          <div className="font-bold">{post.username}</div>
          <div className="text-gray-400 text-sm">
            {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <p className="mb-4">{post.content}</p>

      {post.media_url && (
        <MediaViewer mediaType={post.media_type} mediaUrl={post.media_url} />
      )}

      {/* Interaction Buttons */}
      <div className="mt-4 flex space-x-6 border-t border-gray-700 pt-4">
        <button
          onClick={() => handleInteraction('like')}
          className={`flex items-center space-x-2 transition-colors ${
            interactions.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>❤️</span>
          <span>{interactions.likes}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>💬</span>
          <span>{mockComments.length}</span>
        </button>

        <button
          onClick={() => handleInteraction('share')}
          className={`flex items-center space-x-2 transition-colors ${
            interactions.isShared ? 'text-green-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>↗️</span>
          <span>{interactions.shares}</span>
        </button>

        <button
          onClick={() => handleInteraction('save')}
          className={`flex items-center space-x-2 transition-colors ${
            interactions.isSaved ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🔖</span>
          <span>{interactions.saves}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <Comments postId={post.id} initialComments={mockComments} />
      )}
    </Card>
  );
};

export default Post;
