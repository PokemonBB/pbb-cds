require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const cookie = require('@fastify/cookie');

// Import plugins
const { registerSwagger } = require('./plugins/swagger');
const { registerCORS } = require('./plugins/cors');

// Import routes
const { contentRoutes } = require('./routes/content');
const { healthRoutes } = require('./routes/health');

// Import utilities
const { extractContentZip } = require('./utils/content');
const { contentCache } = require('./utils/cache');

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function registerPlugins() {
  // Register cookie plugin FIRST
  await fastify.register(cookie, {
    secret: JWT_SECRET,
    parseOptions: {}
  });
  
  // Register Swagger
  await registerSwagger(fastify);
  
  // Register CORS
  await registerCORS(fastify);
}

async function registerRoutes() {
  // Register content routes
  await contentRoutes(fastify);
  
  // Register health routes
  await healthRoutes(fastify);
}

async function startServer() {
  try {
    console.log('Starting PBB Content Distribution System...');
    console.log('Extracting CONTENT.zip...');
    
    await extractContentZip();
    
    // Load content cache
    console.log('Loading content cache...');
    await contentCache.loadCache();
    
    // Register all plugins
    await registerPlugins();
    
    // Register all routes
    await registerRoutes();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`PBB-CDS server running on port ${PORT}`);
    console.log(`Content API available at: http://localhost:${PORT}/api/content`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
    console.log(`API Documentation available at:`);
    console.log(`  - http://localhost:${PORT}/docs`);
    console.log(`  - http://localhost:${PORT}/swagger`);
    console.log(`  - http://localhost:${PORT}/api`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
