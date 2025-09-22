import { SimpleSearchService } from '../../../lib/search/simple.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: query, type = 'all', page = '1', limit = '10' } = req.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const searchOptions = {
      type: type === 'all' ? 'all' : type,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10
    };

    const results = await SimpleSearchService.search(query.trim(), searchOptions);
    
    res.status(200).json({
      query: query.trim(),
      type,
      results,
      pagination: {
        page: searchOptions.page,
        limit: searchOptions.limit
      }
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}