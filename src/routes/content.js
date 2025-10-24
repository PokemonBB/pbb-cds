const path = require('path');
const fs = require('fs-extra');
const { authMiddleware } = require('../middleware/auth');
const { getContentListing, countUniqueFiles, CONTENT_DIR_PATH } = require('../utils/content');
const { contentCache } = require('../utils/cache');

async function contentRoutes(fastify) {
  // Get content listing
  fastify.get('/api/content', { 
    preHandler: authMiddleware,
    schema: {
      description: 'Get content listing with authentication',
      tags: ['Content'],
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            content: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  path: { type: 'string' },
                  type: { type: 'string', enum: ['file', 'directory'] },
                  size: { type: 'number' },
                  modified: { type: 'string', format: 'date-time' }
                }
              }
            },
            totalFiles: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Return cached data
      return contentCache.getCache();
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Serve individual files with authentication
  fastify.get('/api/content/file/*', { 
    preHandler: authMiddleware,
    schema: {
      description: 'Serve individual content files with authentication',
      tags: ['Content'],
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          '*': {
            type: 'string',
            description: 'File path relative to content directory'
          }
        }
      },
      response: {
        200: {
          description: 'File content',
          content: {
            'application/octet-stream': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            },
            'image/png': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            },
            'image/jpeg': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            },
            'audio/mpeg': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            },
            'video/mp4': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            },
            'application/json': {
              schema: {
                type: 'object'
              }
            },
            'text/plain': {
              schema: {
                type: 'string'
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const filePath = request.params['*'];
      const fullPath = path.join(CONTENT_DIR_PATH, filePath);
      
      // Security check: ensure the file is within the content directory
      const resolvedPath = path.resolve(fullPath);
      const contentDirResolved = path.resolve(CONTENT_DIR_PATH);
      
      if (!resolvedPath.startsWith(contentDirResolved)) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied' 
        });
      }
      
      // Check if file exists
      if (!await fs.pathExists(fullPath)) {
        return reply.status(404).send({ 
          success: false, 
          error: 'File not found' 
        });
      }
      
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Cannot serve directory' 
        });
      }
      
      // Set appropriate headers
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.json': 'application/json',
        '.txt': 'text/plain'
      };
      
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      reply.type(mimeType);
      
      // Stream the file
      return reply.send(await fs.readFile(fullPath));
      
    } catch (error) {
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });

}

module.exports = { contentRoutes };
