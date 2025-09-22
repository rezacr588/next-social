import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import UserProfile from '../../components/UserProfile';
import Feed from '../../components/Feed';

const UserProfilePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Mock user data
      const mockUser = {
        id,
        username: `User ${id}`,
        email: `user${id}@example.com`,
        bio: `This is the profile of User ${id}. Welcome to my corner of the internet!`,
        avatar: null,
        joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Mock user posts
      const mockPosts = [
        {
          id: '1',
          content: `Hello everyone! This is my first post as User ${id}.`,
          username: `User ${id}`,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          like_count: Math.floor(Math.random() * 10),
          share_count: Math.floor(Math.random() * 5)
        },
        {
          id: '2',
          content: `Sharing some thoughts about the future of social media.`,
          username: `User ${id}`,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          like_count: Math.floor(Math.random() * 15),
          share_count: Math.floor(Math.random() * 3)
        }
      ];

      setUser(mockUser);
      setUserPosts(mockPosts);
      setLoading(false);
    }
  }, [id]);

  const handleFollow = (userId) => {
    console.log(`Following user ${userId}`);
  };

  const handleUnfollow = (userId) => {
    console.log(`Unfollowing user ${userId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-400 mb-4">User Not Found</h1>
        <p className="text-gray-500">The user you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <UserProfile
        user={user}
        isOwnProfile={id === '1'} // Mock: treat user 1 as current user for testing
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-6">{user.username}'s Posts</h2>
        <Feed initialPosts={userPosts} />
      </div>
    </div>
  );
};

export default UserProfilePage;
