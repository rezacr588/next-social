import React, { useState, useEffect } from 'react';
import Avatar from './ui/Avatar';
import Card from './ui/Card';

const UserProfile = ({ user, isOwnProfile = false, onFollow, onUnfollow }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(user?.bio || '');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Mock data for demonstration
    setFollowersCount(Math.floor(Math.random() * 1000));
    setFollowingCount(Math.floor(Math.random() * 500));
    setPostsCount(Math.floor(Math.random() * 100));
  }, []);

  const handleFollowToggle = () => {
    if (isFollowing) {
      onUnfollow && onUnfollow(user.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      onFollow && onFollow(user.id);
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditedBio(user.bio || '');
  };

  const handleSaveProfile = () => {
    // Mock save functionality
    console.log('Saving profile with bio:', editedBio);
    user.bio = editedBio; // Update the user object
    setIsEditing(false);
    setSuccessMessage('Profile updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBio(user.bio || '');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-600 text-white rounded-lg" data-testid="success-message">
          {successMessage}
        </div>
      )}
      
      {/* Profile Header */}
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <Avatar size="lg" alt={user.username} />

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <p className="text-gray-400">{user.email}</p>
                {isEditing ? (
                  <div className="mt-2">
                    <textarea
                      data-testid="bio"
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      className="w-full p-2 bg-gray-800 rounded border border-gray-600 text-white resize-none"
                      rows="3"
                      placeholder="Enter your bio..."
                    />
                  </div>
                ) : (
                  <p className="text-gray-300 mt-2">
                    {user.bio || 'No bio available'}
                  </p>
                )}
              </div>

              {!isOwnProfile && (
                <button
                  onClick={handleFollowToggle}
                  className={`mt-4 md:mt-0 px-6 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-400">{postsCount}</div>
          <div className="text-gray-400">Posts</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-400">{followersCount}</div>
          <div className="text-gray-400">Followers</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-400">{followingCount}</div>
          <div className="text-gray-400">Following</div>
        </Card>
      </div>

      {/* Profile Actions */}
      {isOwnProfile && (
        <Card className="mb-8">
          {isEditing ? (
            <div className="flex space-x-4">
              <button 
                onClick={handleSaveProfile}
                data-testid="save-profile-button"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
              >
                Save Profile
              </button>
              <button 
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex space-x-4">
              <button 
                onClick={handleEditProfile}
                data-testid="edit-profile-button"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
              >
                Edit Profile
              </button>
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
                Settings
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default UserProfile;
