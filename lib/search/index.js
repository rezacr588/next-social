// lib/search/index.js - Advanced Search System with Filters and Sorting
const { databaseManager } = require('../database/index.js');
const { logger } = require('../logger.js');
const { cacheManager } = require('../cache/redis.js');
const { memoize, measurePerformance } = require('../utils/index.js');

class AdvancedSearchService {
  constructor() {
    this.searchIndexes = new Map();
    this.searchHistory = new Map();
    this.popularSearches = new Map();
    this.searchSuggestions = new Map();

    this.initializeSearchIndexes();
    this.loadSearchHistory();
  }

  async initializeSearchIndexes() {
    // Create search indexes for different content types
    this.searchIndexes.set('posts', {
      fields: ['title', 'content', 'excerpt', 'tags'],
      weight: { title: 3, content: 2, excerpt: 2, tags: 1.5 },
      filters: ['status', 'category', 'author', 'dateRange', 'hasMedia'],
      sorting: ['relevance', 'date', 'likes', 'comments', 'views']
    });

    this.searchIndexes.set('users', {
      fields: ['username', 'firstName', 'lastName', 'bio', 'skills'],
      weight: { username: 3, firstName: 2, lastName: 2, bio: 1, skills: 1.5 },
      filters: ['role', 'isVerified', 'hasProfileImage', 'joinDate'],
      sorting: ['relevance', 'followers', 'posts', 'joinDate']
    });

    this.searchIndexes.set('comments', {
      fields: ['content'],
      weight: { content: 1 },
      filters: ['postId', 'author', 'dateRange', 'hasReplies'],
      sorting: ['relevance', 'date', 'likes']
    });

    this.searchIndexes.set('messages', {
      fields: ['content'],
      weight: { content: 1 },
      filters: ['roomId', 'sender', 'dateRange', 'hasAttachments'],
      sorting: ['relevance', 'date']
    });

    logger.info('Search indexes initialized', {
      types: Array.from(this.searchIndexes.keys())
    });
  }

  async loadSearchHistory() {
    // Load search history for suggestions and analytics
    this.searchHistory.set('global', new Map());
    this.popularSearches.set('24h', new Map());
    this.popularSearches.set('7d', new Map());
    this.popularSearches.set('30d', new Map());

    logger.info('Search history and suggestions initialized');
  }

  // Main search method
  async search(query, options = {}) {
    return await measurePerformance('AdvancedSearch.search', async () => {
      const {
        type = 'posts',
        filters = {},
        sorting = 'relevance',
        limit = 20,
        offset = 0,
        userId = null,
        includeSuggestions = true,
        highlightResults = true
      } = options;

      // Record search query
      if (userId) {
        await this.recordSearchQuery(userId, query, type);
      }

      // Get search configuration
      const searchConfig = this.searchIndexes.get(type);
      if (!searchConfig) {
        throw new Error(`Search type '${type}' not supported`);
      }

      // Build search query
      const searchResults = await this.performSearch(query, type, searchConfig, filters, sorting, limit, offset);

      // Process results
      const processedResults = await this.processSearchResults(searchResults, {
        highlight: highlightResults,
        includeMeta: true,
        includeSuggestions: includeSuggestions && query.length > 2
      });

      // Add search metadata
      const result = {
        query,
        type,
        filters,
        sorting,
        pagination: {
          limit,
          offset,
          total: processedResults.total,
          hasMore: offset + limit < processedResults.total
        },
        results: processedResults.items,
        suggestions: processedResults.suggestions,
        facets: processedResults.facets,
        searchTime: processedResults.searchTime,
        cached: false
      };

      logger.info('Search completed', {
        query,
        type,
        results: result.results.length,
        total: result.pagination.total,
        searchTime: result.searchTime
      });

      return result;
    });
  }

  async performSearch(query, type, searchConfig, filters, sorting, limit, offset) {
    // Try cache first
    const cacheKey = `search:${type}:${JSON.stringify({ query, filters, sorting, limit, offset })}`;
    const cachedResult = await cacheManager.get(cacheKey);

    if (cachedResult) {
      cachedResult.cached = true;
      return cachedResult;
    }

    // Build search query
    const searchQuery = this.buildSearchQuery(query, type, searchConfig);
    const filterConditions = this.buildFilterConditions(filters, type);
    const sortClause = this.buildSortClause(sorting, type);
    const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

    const sql = `
      SELECT *,
        ${this.calculateRelevanceScore(query, searchConfig)} as relevance_score
      FROM ${this.getTableName(type)}
      WHERE ${searchQuery}
      ${filterConditions ? `AND ${filterConditions}` : ''}
      ${sortClause}
      ${paginationClause}
    `;

    const results = await this.db.executeQuery(sql, this.getQueryParams(query, filters));

    // Cache results
    await cacheManager.set(cacheKey, results, 300); // 5 minutes cache

    return results;
  }

  buildSearchQuery(query, type, searchConfig) {
    if (!query || query.trim().length === 0) {
      return '1=1'; // Match all records
    }

    const searchTerms = this.tokenizeQuery(query);
    const fieldQueries = [];

    for (const field of searchConfig.fields) {
      const termQueries = searchTerms.map(term => {
        const weight = searchConfig.weight[field] || 1;
        return `(${field} LIKE '%${this.escapeSql(term)}%' * ${weight})`;
      });

      if (termQueries.length > 0) {
        fieldQueries.push(`(${termQueries.join(' + ')})`);
      }
    }

    return fieldQueries.length > 0 ? fieldQueries.join(' OR ') : '1=1';
  }

  buildFilterConditions(filters, type) {
    const searchConfig = this.searchIndexes.get(type);
    const conditions = [];

    if (!searchConfig || !searchConfig.filters) return '';

    for (const filter of searchConfig.filters) {
      if (filters[filter] !== undefined) {
        switch (filter) {
          case 'dateRange':
            if (filters.dateRange.from || filters.dateRange.to) {
              if (filters.dateRange.from) {
                conditions.push(`created_at >= '${filters.dateRange.from}'`);
              }
              if (filters.dateRange.to) {
                conditions.push(`created_at <= '${filters.dateRange.to}'`);
              }
            }
            break;
          case 'hasMedia':
            if (filters.hasMedia) {
              conditions.push('(media_url IS NOT NULL AND media_url != "")');
            }
            break;
          case 'hasProfileImage':
            if (filters.hasProfileImage) {
              conditions.push('(avatar_url IS NOT NULL AND avatar_url != "")');
            }
            break;
          case 'hasReplies':
            if (filters.hasReplies) {
              conditions.push('EXISTS (SELECT 1 FROM comments c2 WHERE c2.parent_id = comments.id)');
            }
            break;
          case 'hasAttachments':
            if (filters.hasAttachments) {
              conditions.push('EXISTS (SELECT 1 FROM message_attachments WHERE message_id = messages.id)');
            }
            break;
          default:
            conditions.push(`${filter} = '${this.escapeSql(filters[filter])}'`);
        }
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }

  buildSortClause(sorting, type) {
    const searchConfig = this.searchIndexes.get(type);
    const validSortFields = searchConfig?.sorting || ['relevance', 'date'];

    let sortField = 'relevance_score';
    let sortOrder = 'DESC';

    if (validSortFields.includes(sorting)) {
      switch (sorting) {
        case 'relevance':
          sortField = 'relevance_score';
          break;
        case 'date':
          sortField = 'created_at';
          break;
        case 'likes':
          sortField = 'like_count';
          break;
        case 'comments':
          sortField = 'comment_count';
          break;
        case 'views':
          sortField = 'view_count';
          break;
        case 'followers':
          sortField = 'follower_count';
          break;
        case 'posts':
          sortField = 'post_count';
          break;
        case 'joinDate':
          sortField = 'created_at';
          break;
      }
    }

    return `ORDER BY ${sortField} ${sortOrder}`;
  }

  calculateRelevanceScore(query, searchConfig) {
    if (!query) return '1';

    const terms = this.tokenizeQuery(query);
    const scoreComponents = [];

    for (const field of searchConfig.fields) {
      const weight = searchConfig.weight[field] || 1;

      for (const term of terms) {
        scoreComponents.push(`(CASE WHEN ${field} LIKE '%${this.escapeSql(term)}%' THEN ${weight} ELSE 0 END)`);
      }
    }

    return scoreComponents.join(' + ');
  }

  getTableName(type) {
    const tableMap = {
      posts: 'posts',
      users: 'users',
      comments: 'comments',
      messages: 'messages'
    };

    return tableMap[type] || 'posts';
  }

  getQueryParams(query, filters) {
    const params = [];

    if (query) {
      const terms = this.tokenizeQuery(query);
      params.push(...terms.map(term => `%${term}%`));
    }

    // Add filter params
    if (filters.author) params.push(filters.author);
    if (filters.category) params.push(filters.category);
    if (filters.status) params.push(filters.status);
    if (filters.role) params.push(filters.role);

    return params;
  }

  tokenizeQuery(query) {
    // Advanced query tokenization
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(term => term.length > 1) // Remove single characters
      .slice(0, 10); // Limit to 10 terms
  }

  escapeSql(str) {
    return str.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  async processSearchResults(results, options = {}) {
    const { highlight = true, includeMeta = true, includeSuggestions = false } = options;

    const processedResults = {
      items: results,
      total: results.length,
      searchTime: Date.now(),
      suggestions: [],
      facets: {},
      cached: false
    };

    if (highlight) {
      processedResults.items = this.highlightSearchResults(processedResults.items, options.query);
    }

    if (includeSuggestions) {
      processedResults.suggestions = await this.getSearchSuggestions(options.query, options.type);
    }

    if (includeMeta) {
      processedResults.facets = await this.generateSearchFacets(options.type, options.filters);
    }

    return processedResults;
  }

  highlightSearchResults(items, query) {
    if (!query || items.length === 0) return items;

    const terms = this.tokenizeQuery(query);

    return items.map(item => {
      const highlightedItem = { ...item };

      // Highlight matches in text fields
      for (const field of ['title', 'content', 'excerpt', 'username', 'bio']) {
        if (highlightedItem[field]) {
          highlightedItem[`${field}_highlighted`] = this.highlightText(
            highlightedItem[field],
            terms
          );
        }
      }

      return highlightedItem;
    });
  }

  highlightText(text, terms) {
    let highlightedText = text;

    for (const term of terms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    }

    return highlightedText;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async getSearchSuggestions(query, type, limit = 5) {
    if (query.length < 2) return [];

    const suggestions = [];

    // Get suggestions from search history
    const historySuggestions = await this.getHistoryBasedSuggestions(query, type, limit);
    suggestions.push(...historySuggestions);

    // Get suggestions from popular searches
    const popularSuggestions = await this.getPopularSuggestions(query, type, limit);
    suggestions.push(...popularSuggestions);

    // Get suggestions from content
    const contentSuggestions = await this.getContentBasedSuggestions(query, type, limit);
    suggestions.push(...contentSuggestions);

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Set(suggestions)]
      .slice(0, limit)
      .map(suggestion => ({ text: suggestion, type: 'suggestion' }));

    return uniqueSuggestions;
  }

  async getHistoryBasedSuggestions(query, type, limit) {
    const history = this.searchHistory.get('global') || new Map();
    const suggestions = [];

    for (const [searchQuery, count] of history.entries()) {
      if (searchQuery.toLowerCase().includes(query.toLowerCase()) && count > 1) {
        suggestions.push(searchQuery);
      }
    }

    return suggestions.slice(0, limit);
  }

  async getPopularSuggestions(query, type, limit) {
    const suggestions = [];
    const timeframe = this.getBestTimeframeForSuggestions();

    for (const [searchQuery, data] of this.popularSearches.get(timeframe).entries()) {
      if (searchQuery.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(searchQuery);
      }
    }

    return suggestions.slice(0, limit);
  }

  async getContentBasedSuggestions(query, type, limit) {
    // Mock content-based suggestions
    const mockSuggestions = [
      'JavaScript tutorials',
      'React components',
      'Node.js performance',
      'Database optimization',
      'API design patterns'
    ];

    return mockSuggestions
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  getBestTimeframeForSuggestions() {
    const hour = new Date().getHours();

    if (hour < 6) return '30d'; // Night time - broader suggestions
    if (hour < 12) return '7d'; // Morning - medium timeframe
    return '24h'; // Day time - recent suggestions
  }

  async generateSearchFacets(type, appliedFilters) {
    const searchConfig = this.searchIndexes.get(type);
    const facets = {};

    if (!searchConfig || !searchConfig.filters) return facets;

    // Generate category facets
    if (searchConfig.filters.includes('category')) {
      facets.categories = await this.getFacetData('category', type);
    }

    // Generate author/user facets
    if (searchConfig.filters.includes('author')) {
      facets.authors = await this.getFacetData('author', type);
    }

    // Generate date range facets
    if (searchConfig.filters.includes('dateRange')) {
      facets.dateRanges = this.getDateRangeFacets();
    }

    // Generate status facets
    if (searchConfig.filters.includes('status')) {
      facets.statuses = await this.getFacetData('status', type);
    }

    return facets;
  }

  async getFacetData(facetType, type) {
    const tableName = this.getTableName(type);

    switch (facetType) {
      case 'category':
        return await this.db.executeQuery(`
          SELECT category, COUNT(*) as count
          FROM ${tableName}
          GROUP BY category
          ORDER BY count DESC
          LIMIT 10
        `);

      case 'author':
        return await this.db.executeQuery(`
          SELECT author, COUNT(*) as count
          FROM ${tableName}
          GROUP BY author
          ORDER BY count DESC
          LIMIT 10
        `);

      case 'status':
        return await this.db.executeQuery(`
          SELECT status, COUNT(*) as count
          FROM ${tableName}
          GROUP BY status
          ORDER BY count DESC
        `);

      default:
        return [];
    }
  }

  getDateRangeFacets() {
    return [
      { label: 'Today', value: 'today', count: 0 },
      { label: 'This Week', value: 'week', count: 0 },
      { label: 'This Month', value: 'month', count: 0 },
      { label: 'This Year', value: 'year', count: 0 }
    ];
  }

  async recordSearchQuery(userId, query, type) {
    // Record in search history
    const history = this.searchHistory.get('global') || new Map();
    history.set(query, (history.get(query) || 0) + 1);
    this.searchHistory.set('global', history);

    // Record in popular searches
    const timeframes = ['24h', '7d', '30d'];
    for (const timeframe of timeframes) {
      const popular = this.popularSearches.get(timeframe) || new Map();
      popular.set(query, (popular.get(query) || 0) + 1);
      this.popularSearches.set(timeframe, popular);
    }

    logger.debug('Search query recorded', { userId, query, type });
  }

  // Advanced search features
  async searchWithAI(query, options = {}) {
    // Mock AI-powered search
    const baseResults = await this.search(query, options);

    // Add AI-powered features
    const aiEnhancedResults = {
      ...baseResults,
      aiFeatures: {
        searchIntent: this.detectSearchIntent(query),
        relatedQueries: await this.getRelatedQueries(query),
        queryExpansion: this.expandQuery(query),
        semanticMatches: await this.findSemanticMatches(query, options.type),
        trendingTopics: await this.getTrendingTopics()
      }
    };

    return aiEnhancedResults;
  }

  detectSearchIntent(query) {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('how to') || queryLower.includes('tutorial')) {
      return 'learning';
    } else if (queryLower.includes('best') || queryLower.includes('top')) {
      return 'comparison';
    } else if (queryLower.includes('why') || queryLower.includes('explain')) {
      return 'explanation';
    } else if (queryLower.includes('error') || queryLower.includes('fix')) {
      return 'problem_solving';
    }

    return 'general';
  }

  async getRelatedQueries(query, limit = 5) {
    // Mock related queries
    const relatedQueries = [
      `${query} tutorial`,
      `${query} examples`,
      `${query} best practices`,
      `advanced ${query}`,
      `${query} vs alternatives`
    ];

    return relatedQueries.slice(0, limit);
  }

  expandQuery(query) {
    // Mock query expansion
    const expansions = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'react': 'React.js',
      'node': 'Node.js',
      'db': 'database',
      'api': 'API development',
      'ui': 'user interface',
      'ux': 'user experience'
    };

    let expanded = query;
    Object.entries(expansions).forEach(([abbr, full]) => {
      expanded = expanded.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    });

    return expanded;
  }

  async findSemanticMatches(query, type, limit = 3) {
    // Mock semantic search
    return [
      { id: '1', title: 'Semantic match 1', relevance: 0.95 },
      { id: '2', title: 'Semantic match 2', relevance: 0.87 },
      { id: '3', title: 'Semantic match 3', relevance: 0.82 }
    ].slice(0, limit);
  }

  async getTrendingTopics(limit = 10) {
    // Mock trending topics
    return [
      { topic: 'JavaScript ES2024', count: 150 },
      { topic: 'React Server Components', count: 120 },
      { topic: 'AI Integration', count: 100 },
      { topic: 'Performance Optimization', count: 90 },
      { topic: 'Database Design', count: 80 }
    ].slice(0, limit);
  }

  // Search analytics
  async getSearchAnalytics(timeframe = '30d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    return {
      totalSearches: await this.getTotalSearchCount(startDate),
      popularQueries: await this.getPopularQueries(startDate, timeframe),
      searchTrends: await this.getSearchTrends(startDate),
      userSearchBehavior: await this.getUserSearchBehavior(startDate),
      searchPerformance: await this.getSearchPerformanceMetrics(startDate),
      zeroResultQueries: await this.getZeroResultQueries(startDate)
    };
  }

  async getTotalSearchCount(startDate) {
    // Mock total search count
    return Math.floor(Math.random() * 10000);
  }

  async getPopularQueries(startDate, timeframe) {
    const popular = this.popularSearches.get(timeframe) || new Map();
    return Array.from(popular.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  async getSearchTrends(startDate) {
    // Mock search trends
    return [
      { date: '2024-01-01', searches: 1200 },
      { date: '2024-01-02', searches: 1350 },
      { date: '2024-01-03', searches: 1180 },
      { date: '2024-01-04', searches: 1420 },
      { date: '2024-01-05', searches: 1650 }
    ];
  }

  async getUserSearchBehavior(startDate) {
    return {
      averageQueriesPerUser: 3.2,
      topSearchCategories: ['technology', 'programming', 'design'],
      searchFrequency: {
        daily: 45,
        weekly: 30,
        monthly: 25
      }
    };
  }

  async getSearchPerformanceMetrics(startDate) {
    return {
      averageResponseTime: 150, // milliseconds
      cacheHitRate: 78,
      indexUsage: 92,
      queryComplexity: 'medium'
    };
  }

  async getZeroResultQueries(startDate) {
    // Mock zero result queries
    return [
      { query: 'advanced quantum computing tutorials', count: 5 },
      { query: 'machine learning for social media', count: 3 },
      { query: 'blockchain integration patterns', count: 2 }
    ];
  }

  // Autocomplete functionality
  async getAutocompleteSuggestions(query, limit = 10) {
    if (query.length < 2) return [];

    const suggestions = [];

    // Get suggestions from various sources
    const historySuggestions = await this.getHistoryBasedSuggestions(query, 'posts', limit);
    const popularSuggestions = await this.getPopularSuggestions(query, 'posts', limit);
    const contentSuggestions = await this.getContentBasedSuggestions(query, 'posts', limit);

    suggestions.push(...historySuggestions, ...popularSuggestions, ...contentSuggestions);

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = [...new Set(suggestions)]
      .slice(0, limit)
      .map(suggestion => ({
        text: suggestion,
        type: 'autocomplete',
        score: this.calculateSuggestionScore(suggestion, query)
      }))
      .sort((a, b) => b.score - a.score);

    return uniqueSuggestions;
  }

  calculateSuggestionScore(suggestion, query) {
    const suggestionLower = suggestion.toLowerCase();
    const queryLower = query.toLowerCase();

    let score = 0;

    // Exact prefix match gets highest score
    if (suggestionLower.startsWith(queryLower)) {
      score += 10;
    }

    // Contains query as substring
    if (suggestionLower.includes(queryLower)) {
      score += 5;
    }

    // Word boundary matches
    const queryWords = queryLower.split(' ');
    for (const word of queryWords) {
      if (suggestionLower.includes(word)) {
        score += 2;
      }
    }

    // Length bonus for shorter, more relevant suggestions
    score += Math.max(0, 10 - suggestion.length);

    return score;
  }

  // Search configuration management
  async updateSearchIndex(type, config) {
    if (!this.searchIndexes.has(type)) {
      this.searchIndexes.set(type, config);
    } else {
      Object.assign(this.searchIndexes.get(type), config);
    }

    logger.info('Search index updated', { type, fields: config.fields?.length });
    return true;
  }

  async reindexContent(type) {
    // Mock reindexing
    logger.info('Content reindexing started', { type });

    // Clear cache for this type
    await cacheManager.deletePattern(`search:${type}:*`);

    logger.info('Content reindexing completed', { type });
    return true;
  }

  // Health check
  getHealth() {
    return {
      isHealthy: true,
      indexedTypes: Array.from(this.searchIndexes.keys()).length,
      searchHistorySize: this.searchHistory.get('global')?.size || 0,
      popularSearchesSize: Object.values(this.popularSearches).reduce((sum, map) => sum + map.size, 0),
      cacheSize: 0, // Would get from cache manager
      timestamp: new Date()
    };
  }

  // Cache management
  clearCache() {
    // Clear search-related caches
    cacheManager.deletePattern('search:*');
    logger.info('Search cache cleared');
  }

  // Export search data
  async exportSearchData(format = 'json') {
    const exportData = {
      searchIndexes: Object.fromEntries(this.searchIndexes),
      popularSearches: Object.fromEntries(
        Object.entries(this.popularSearches).map(([timeframe, searches]) => [
          timeframe,
          Object.fromEntries(searches)
        ])
      ),
      searchHistory: Object.fromEntries(this.searchHistory),
      analytics: await this.getSearchAnalytics('30d'),
      exportedAt: new Date()
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }

    return exportData;
  }

  get db() {
    return databaseManager;
  }
}

const searchService = new AdvancedSearchService();

module.exports = {
  AdvancedSearchService,
  searchService
};
