export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiDocs = {
    openapi: '3.0.0',
    info: {
      title: 'Nexus Social API',
      version: '1.0.0',
      description: 'API documentation for Nexus Social platform'
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://nexus-social.app' : 'http://localhost:3005',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'User registered successfully' },
            '400': { description: 'Invalid input' },
            '409': { description: 'User already exists' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Login user',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' }
          }
        }
      },
      '/api/feed': {
        get: {
          summary: 'Get posts feed',
          tags: ['Posts'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
            }
          ],
          responses: {
            '200': { description: 'Feed retrieved successfully' }
          }
        }
      },
      '/api/posts/create': {
        post: {
          summary: 'Create a new post',
          tags: ['Posts'],
          parameters: [
            {
              name: 'x-user-id',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              description: 'User ID for authentication (temporary)'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string', minLength: 1, maxLength: 500 },
                    mediaUrl: { type: 'string', format: 'uri' },
                    mediaType: { type: 'string', enum: ['text', 'image', 'video'] }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Post created successfully' },
            '401': { description: 'Authentication required' },
            '400': { description: 'Invalid input' }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            content: { type: 'string' },
            media_url: { type: 'string', format: 'uri' },
            media_type: { type: 'string' },
            like_count: { type: 'integer' },
            share_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            username: { type: 'string' }
          }
        }
      }
    }
  };

  res.status(200).json(apiDocs);
}