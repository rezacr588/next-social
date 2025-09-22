import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Post from './Post';

const Feed = ({ initialPosts = [] }) => {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const handleCreatePost = (postData) => {
    // Mock post creation
    const newPost = {
      id: Date.now().toString(),
      content: postData.content,
      username: 'Test User',
      created_at: new Date().toISOString(),
      media_url: postData.mediaUrl,
      media_type: postData.mediaType,
      like_count: 0,
      share_count: 0
    };

    setPosts(prevPosts => [newPost, ...prevPosts]);
  };

  return (
    <div className="space-y-6">
      {/* Post creation area */}
      <div className="glass p-8 hover-lift animate-fade-in-up">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Share Your Thoughts
          </h2>
        </div>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleCreatePost({
              content: formData.get('content'),
              mediaUrl: formData.get('mediaUrl'),
              mediaType: formData.get('mediaType')
            });
            e.target.reset();
          }}
          className="space-y-6"
        >
          <div className="relative">
            <textarea
              name="content"
              placeholder="What's inspiring you today?"
              className="input-modern w-full min-h-[120px] resize-none"
              rows="4"
              required
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              name="mediaUrl"
              placeholder="Add media URL (optional)"
              className="input-modern flex-1"
            />
            <select
              name="mediaType"
              className="input-modern sm:w-auto"
            >
              <option value="text">📝 Text</option>
              <option value="image">🖼️ Image</option>
              <option value="video">🎥 Video</option>
              <option value="3d">🎮 3D Model</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Share responsibly</span>
              </span>
            </div>
            <button
              type="submit"
              className="btn-primary px-8 py-3 hover-lift"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Share Post</span>
              </div>
            </button>
          </div>
        </form>
      </div>

      {/* Posts feed */}
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <div key={post.id} className={`animate-fade-in-up hover-lift`} style={{ animationDelay: `${index * 0.1}s` }}>
              {/* User profile link */}
              <div className="glass p-6 relative overflow-hidden">
                <div className="flex items-center space-x-3 mb-4">
                  <Link
                    href={`/user/${post.user_id || 1}`}
                    className="flex items-center space-x-3 hover:bg-white/5 rounded-lg p-2 -m-2 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white">{post.username}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                </div>

                <Post post={post} />
              </div>
            </div>
          ))
        ) : (
          <div className="glass p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No posts yet</h3>
            <p className="text-gray-400">Be the first to share something amazing with the community!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
