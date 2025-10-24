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

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
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
  });

  fastify.get('/swagger', {
    schema: { hide: true }
  }, async (request, reply) => {
    reply.redirect('/docs');
  });

  fastify.get('/api', {
    schema: { hide: true }
  }, async (request, reply) => {
    reply.redirect('/docs');
  });

  fastify.get('/swagger/*', {
    schema: { hide: true }
  }, async (request, reply) => {
    const rest = request.params['*'] || '';
    reply.redirect(`/docs/${rest}`);
  });

  fastify.get('/api/*', {
    schema: { hide: true }
  }, async (request, reply) => {
    const rest = request.params['*'] || '';
    reply.redirect(`/docs/${rest}`);
  });
}

module.exports = { registerSwagger };
