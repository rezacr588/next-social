import React from 'react';
import Feed from '../components/Feed';
import ChatRoom from '../components/ChatRoom';

const ExplorePage = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Explore Nexus</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feed Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Community Feed</h2>
          <Feed initialPosts={[]} />
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
