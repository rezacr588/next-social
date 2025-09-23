import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Post from '../components/Post';

export default function SearchPage() {
  const router = useRouter();
  const { q: query, type = 'all' } = router.query;
  
  const [results, setResults] = useState({ posts: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [searchType, setSearchType] = useState(type);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query, type);
    }
  }, [query, type]);

  const performSearch = async (searchTerm, searchType = 'all') => {
    if (!searchTerm?.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&type=${searchType}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
  };

  const handleTypeChange = (newType) => {
    setSearchType(newType);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${newType}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, users, and more..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="search-input"
              />
            </div>
            
            {/* Search Type Filters */}
            <div className="flex space-x-4">
              {['all', 'posts', 'users'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-4 py-2 rounded-lg capitalize font-medium transition-colors ${ 
                    searchType === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {query && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Search Results for "{query}"
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            ) : (
              <>
                {/* Posts Results */}
                {(searchType === 'all' || searchType === 'posts') && results.posts && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Posts ({results.posts.length})
                    </h3>
                    {results.posts.length > 0 ? (
                      <div className="space-y-4" data-testid="search-results-posts">
                        {results.posts.map((post) => (
                          <Post key={post.id} post={post} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No posts found.</p>
                    )}
                  </div>
                )}

                {/* Users Results */}
                {(searchType === 'all' || searchType === 'users') && results.users && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Users ({results.users.length})
                    </h3>
                    {results.users.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2" data-testid="search-results-users">
                        {results.users.map((user) => (
                          <div key={user.id} className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{user.username}</h4>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <p className="text-xs text-gray-500">
                                  Joined {new Date(user.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <a
                                href={`/user/${user.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Profile →
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No users found.</p>
                    )}
                  </div>
                )}

                {/* No Results */}
                {!results.posts?.length && !results.users?.length && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No results found for your search.</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try different keywords or check your spelling.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
