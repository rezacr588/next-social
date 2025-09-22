import React, { useState, useEffect } from 'react';
import Card from './ui/Card';

const Search = ({ onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState({
    posts: [],
    users: []
  });

  const mockSearchData = {
    posts: [
      {
        id: '1',
        content: 'Welcome to Nexus! This is an amazing platform.',
        username: 'Nexus Team',
        created_at: new Date().toISOString(),
        like_count: 10,
        share_count: 5
      },
      {
        id: '2',
        content: 'Check out the new features we added!',
        username: 'Dev Team',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        like_count: 8,
        share_count: 3
      }
    ],
    users: [
      {
        id: '1',
        username: 'Nexus Team',
        email: 'team@nexus.com',
        bio: 'Official Nexus development team'
      },
      {
        id: '2',
        username: 'Dev Team',
        email: 'dev@nexus.com',
        bio: 'Development team working on new features'
      }
    ]
  };

  useEffect(() => {
    if (query.length > 2) {
      setIsSearching(true);

      // Simulate search delay
      const timer = setTimeout(() => {
        const filteredPosts = mockSearchData.posts.filter(post =>
          post.content.toLowerCase().includes(query.toLowerCase()) ||
          post.username.toLowerCase().includes(query.toLowerCase())
        );

        const filteredUsers = mockSearchData.users.filter(user =>
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.bio.toLowerCase().includes(query.toLowerCase())
        );

        setResults({
          posts: filteredPosts,
          users: filteredUsers
        });
        setIsSearching(false);

        onSearchResults && onSearchResults({
          posts: filteredPosts,
          users: filteredUsers
        });
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setResults({ posts: [], users: [] });
      onSearchResults && onSearchResults({ posts: [], users: [] });
    }
  }, [query, onSearchResults]);

  return (
    <div className="relative">
      <Card className="p-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, users..."
            data-testid="search-input"
            className="w-full p-3 pl-10 bg-gray-800 rounded-lg border border-gray-600 text-white focus:border-purple-500 focus:outline-none"
          />
          <div className="absolute left-3 top-3 text-gray-400">
            🔍
          </div>
          {isSearching && (
            <div className="absolute right-3 top-3 text-gray-400">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </Card>

      {/* Search Results */}
      {(results.posts.length > 0 || results.users.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto z-50" data-testid="search-results">
          <div className="p-4">
            <h3 className="font-bold text-purple-400 mb-3">Search Results</h3>

            {/* Users */}
            {results.users.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Users</h4>
                {results.users.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded" data-testid="search-result">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-400">{user.bio}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts */}
            {results.posts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Posts</h4>
                {results.posts.map(post => (
                  <div key={post.id} className="p-2 hover:bg-gray-700 rounded" data-testid="search-result">
                    <div className="font-medium text-purple-400">{post.username}</div>
                    <div className="text-sm text-gray-300">{post.content.substring(0, 100)}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Search;
