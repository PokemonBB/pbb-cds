require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const fs = require('fs-extra');
const path = require('path');
const yauzl = require('yauzl');
const jwt = require('jsonwebtoken');
const cookie = require('@fastify/cookie');

// Register Swagger plugins first
async function registerPlugins() {
  // Register cookie plugin FIRST
  await fastify.register(cookie, {
    secret: JWT_SECRET,
    parseOptions: {}
  });
  
  // Register Swagger plugin
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'PBB Content Distribution System API',
        description: 'API for distributing and serving content with authentication',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token'
          }
        }
      }
    }
  });

  // Register Swagger UI plugin
  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
      persistAuthorization: true
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
    transformSpecificationClone: true
  });
  
  // Register CORS plugin
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  await fastify.register(require('@fastify/cors'), {
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
  });
}

// Define routes after plugins are registered
async function defineRoutes() {
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
      const contentListing = await getContentListing();
      const totalFiles = await countUniqueFiles();
      
      return {
        success: true,
        content: contentListing,
        totalFiles: totalFiles
      };
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



  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return { status: 'OK', timestamp: new Date().toISOString() };
  });
}

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CONTENT_ZIP_PATH = path.join(__dirname, 'CONTENT.zip');
const CONTENT_DIR_PATH = path.join(__dirname, 'CONTENT');

async function extractContentZip() {
  try {
    if (!await fs.pathExists(CONTENT_ZIP_PATH)) {
      throw new Error('CONTENT.zip not found in root directory');
    }

    if (await fs.pathExists(CONTENT_DIR_PATH)) {
      await fs.remove(CONTENT_DIR_PATH);
    }

    await fs.ensureDir(CONTENT_DIR_PATH);

    return new Promise((resolve, reject) => {
      yauzl.open(CONTENT_ZIP_PATH, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const filePath = path.join(CONTENT_DIR_PATH, entry.fileName);
            fs.ensureDir(path.dirname(filePath)).then(() => {
              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);
              writeStream.on('close', () => {
                zipfile.readEntry();
              });
            });
          });
        });

        zipfile.on('end', () => {
          console.log('Content extracted successfully');
          resolve();
        });

        zipfile.on('error', reject);
      });
    });
  } catch (error) {
    console.error('Error extracting content:', error);
    process.exit(1);
  }
}

async function getContentListing() {
  try {
    const listing = [];
    
    async function listDirectoryRecursively(dirPath, relativePath = '') {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
        const stats = await fs.stat(itemPath);
        
        listing.push({
          name: item.name,
          path: itemRelativePath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        });
        
        if (item.isDirectory()) {
          await listDirectoryRecursively(itemPath, itemRelativePath);
        }
      }
    }
    
    await listDirectoryRecursively(CONTENT_DIR_PATH);
    return listing;
  } catch (error) {
    throw new Error(`Error reading content directory: ${error.message}`);
  }
}

async function countUniqueFiles() {
  try {
    let fileCount = 0;
    
    async function countFilesRecursively(dirPath) {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await countFilesRecursively(itemPath);
        } else {
          fileCount++;
        }
      }
    }
    
    await countFilesRecursively(CONTENT_DIR_PATH);
    return fileCount;
  } catch (error) {
    throw new Error(`Error counting files: ${error.message}`);
  }
}

// Authentication middleware
async function authMiddleware(request, reply) {
  try {
    let token = null;
    
    // Try to get token from parsed cookies first
    if (request.cookies?.token) {
      token = request.cookies.token;
    }
    // Try to parse cookies manually from headers
    else if (request.headers.cookie) {
      const cookies = request.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      if (cookies.token) {
        token = cookies.token;
      }
    }
    // Try Authorization header
    else if (request.headers.authorization) {
      token = request.headers.authorization.replace('Bearer ', '');
    }
    
    if (!token) {
      return reply.status(401).send({ 
        success: false, 
        error: 'Authentication required. Please login to access content.' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("🔴 - index.js::463 - decoded ->", decoded);
    
    // Check if user is active
    if (!decoded.active) {
      return reply.status(403).send({ 
        success: false, 
        error: 'Account is not activated. Please check your email and activate your account.' 
      });
    }

    // Add user info to request
    request.user = {
      id: decoded.sub,
      username: decoded.username,
      active: decoded.active,
      role: decoded.role
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send({ 
        success: false, 
        error: 'Token expired. Please login again.' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return reply.status(401).send({ 
        success: false, 
        error: 'Invalid token. Please login again.' 
      });
    } else {
      return reply.status(401).send({ 
        success: false, 
        error: 'Authentication failed.' 
      });
    }
  }
}


async function startServer() {
  try {
    console.log('Starting PBB Content Distribution System...');
    console.log('Extracting CONTENT.zip...');
    
    await extractContentZip();
    
    // Register all plugins
    await registerPlugins();
    
    // Define routes after plugins are registered
    await defineRoutes();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`PBB-CDS server running on port ${PORT}`);
    console.log(`Content API available at: http://localhost:${PORT}/api/content`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
    console.log(`API Documentation available at: http://localhost:${PORT}/docs`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
