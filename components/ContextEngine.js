import React from 'react';
import Card from './ui/Card';

const ContextEngine = ({ posts }) => {
  // Simulate AI semantic analysis
  const analyzeContext = () => {
    const allTags = posts.flatMap(post => post.context?.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
    
    return {
      primaryThemes: topTags,
      sentiment: 'positive'
    };
  };
  
  const context = analyzeContext();
  
  return (
    <Card className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-xl p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">AI Context Analysis</h2>
      <div className="flex flex-wrap gap-2">
        {context.primaryThemes.map(theme => (
          <span 
            key={theme} 
            className="px-3 py-1 bg-purple-700 rounded-full text-sm"
          >
            #{theme}
          </span>
        ))}
      </div>
      <p className="mt-4 text-purple-200">
        Your feed shows strong interest in {context.primaryThemes.join(', ')} 
        with {context.sentiment} sentiment
      </p>
    </Card>
  );
};

export default ContextEngine;
