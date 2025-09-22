import React, { useState, useEffect } from 'react';
import Feed from '../components/Feed';
import Search from '../components/Search';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [searchResults, setSearchResults] = useState(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      } else {
        // If API fails, show some sample posts
        setPosts([
          {
            id: '1',
            content: 'Welcome to Nexus! This is an innovative social platform focused on ethical design and real-time interactions.',
            username: 'Platform Team',
            created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            media_url: null,
            media_type: 'text',
            like_count: 10,
            share_count: 5
          },
          {
            id: '2',
            content: 'Check out our community page for live chat and more features!',
            username: 'Community Manager',
            created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            media_url: null,
            media_type: 'text',
            like_count: 8,
            share_count: 3
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      // Show sample posts on error
      setPosts([
        {
          id: '1',
          content: 'Welcome to Nexus! This is an innovative social platform focused on ethical design and real-time interactions.',
          username: 'Platform Team',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          media_url: null,
          media_type: 'text',
          like_count: 10,
          share_count: 5
        }
      ]);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSearchResults = (results) => {
    setSearchResults(results);
  };

  return (
    <div className="max-w-6xl mx-auto" data-testid="main-content">
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl mb-6 shadow-2xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
          Your Decentralized Feed
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Connect with others in real-time on our ethical social platform designed for meaningful interactions
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <Search onSearchResults={handleSearchResults} />
      </div>

      {/* Search Results */}
      {searchResults && (searchResults.posts.length > 0 || searchResults.users.length > 0) ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Search Results</h2>

          {searchResults.users.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.users.map(user => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="font-bold">{user.username}</h4>
                    <p className="text-gray-400 text-sm">{user.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.posts.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Posts</h3>
              <Feed initialPosts={searchResults.posts} />
            </div>
          )}
        </div>
      ) : (
        /* Regular Feed */
        <Feed initialPosts={posts} />
      )}
    </div>
  );
};

export default HomePage;
