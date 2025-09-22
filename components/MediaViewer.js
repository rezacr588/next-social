import React from 'react';

const MediaViewer = ({ mediaType, mediaUrl }) => {
  if (mediaType === 'image') {
    return (
      <div className="my-4">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-64" />
      </div>
    );
  }
  
  if (mediaType === '3d') {
    return (
      <div className="my-4 perspective-container">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center">
            <span className="text-gray-700">3D Model Viewer</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">Drag to rotate, scroll to zoom</p>
        </div>
      </div>
    );
  }
  
  return null;
};

export default MediaViewer;
