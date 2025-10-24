# PBB Content Distribution System

API para distribución de contenido con autenticación JWT.

## Estructura del Proyecto

```
pbb-cds/
├── src/
│   ├── app.js                 # Archivo principal de la aplicación
│   ├── middleware/
│   │   └── auth.js           # Middleware de autenticación
│   ├── plugins/
│   │   ├── swagger.js        # Configuración de Swagger
│   │   └── cors.js           # Configuración de CORS
│   ├── routes/
│   │   ├── content.js        # Rutas de contenido
│   │   └── health.js         # Rutas de health check
│   └── utils/
│       └── content.js        # Utilidades para manejo de contenido
├── CONTENT.zip               # Archivo ZIP con el contenido
├── package.json
├── nodemon.json
└── README.md
```

## Scripts Disponibles

- `yarn dev` - Ejecuta el servidor en modo desarrollo con nodemon
- `yarn start` - Ejecuta el servidor en modo producción

## Endpoints Disponibles

### Autenticación

- Requiere cookie `token` con JWT válido
- Soporta también Authorization header con Bearer token

### API Endpoints

#### GET /api/content

- **Descripción**: Lista todo el contenido disponible
- **Autenticación**: Requerida
- **Respuesta**: Lista de archivos y directorios con metadatos

#### GET /api/content/file/\*

- **Descripción**: Sirve archivos individuales
- **Autenticación**: Requerida
- **Parámetros**: Ruta del archivo relativa al directorio de contenido

#### GET /health

- **Descripción**: Health check del sistema
- **Autenticación**: No requerida
- **Respuesta**: Estado del servidor y timestamp

#### GET /docs, /swagger, /api

- **Descripción**: Documentación Swagger UI (disponible en 3 endpoints)
- **Autenticación**: No requerida

## Desarrollo

1. Instalar dependencias:

   ```bash
   yarn install
   ```

2. Configurar variables de entorno:

   ```bash
   cp env.example .env
   # Editar .env con tus valores
   ```

3. Ejecutar en modo desarrollo:

   ```bash
   yarn dev
   ```

4. Acceder a la documentación:
   - API Docs: http://localhost:3000/docs
   - API Docs: http://localhost:3000/swagger
   - API Docs: http://localhost:3000/api
   - Health: http://localhost:3000/health

## Características

- ✅ Autenticación JWT con cookies
- ✅ Documentación Swagger/OpenAPI
- ✅ CORS configurado
- ✅ Manejo de archivos multimedia
- ✅ Estructura modular
- ✅ Auto-reload en desarrollo
- ✅ Sistema de cache para optimizar rendimiento
