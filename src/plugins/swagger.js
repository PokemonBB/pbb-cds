async function registerSwagger(fastify) {
  // Register Swagger plugin
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'PBB Content Distribution System API',
        description: 'API for distributing and serving content with authentication',
        version: '1.0.0'
      },
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

  // Common Swagger UI configuration
  const swaggerUIConfig = {
    uiConfig: {
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
  };

  // Register Swagger UI for multiple endpoints
  const endpoints = ['/docs', '/swagger', '/api'];
  
  for (const endpoint of endpoints) {
    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: endpoint,
      ...swaggerUIConfig
    });
  }
}

module.exports = { registerSwagger };
