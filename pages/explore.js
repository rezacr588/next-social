import React, { useEffect, useState } from 'react';
import Feed from '../components/Feed';
import ChatRoom from '../components/ChatRoom';

const ExplorePage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const samplePosts = [
      {
        id: 'sample-1',
        content: 'Welcome to the explore feed! Check out what the community is sharing.',
        username: 'Explore Bot',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        media_url: null,
        media_type: 'text',
        like_count: 3,
        share_count: 1,
      },
    ];

    const loadFeed = async () => {
      try {
        const response = await fetch('/api/feed');
        if (!response.ok) {
          throw new Error('Failed to load feed');
        }
        const data = await response.json();
        if (isMounted) {
          setPosts(data);
        }
      } catch (error) {
        console.warn('Explore feed fallback:', error);
        if (isMounted) {
          setPosts(samplePosts);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    };

    loadFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Explore Nexus</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feed Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Community Feed</h2>
          {isLoadingFeed ? (
            <div className="glass p-6 text-gray-300">Loading feed...</div>
          ) : (
            <Feed initialPosts={posts} />
          )}
        </div>

        {/* Chat Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Live Chat</h2>
          <ChatRoom />
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
