const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

module.exports = { authMiddleware };
