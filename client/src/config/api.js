// API Configuration for Development and Production

// In production, use relative URLs (same domain)
// In development, use localhost:3002
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Production: relative URLs
  : 'http://localhost:3002/api';  // Development: localhost

export default API_BASE_URL;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (process.env.NODE_ENV === 'production') {
    return `/api/${cleanEndpoint}`;
  } else {
    return `http://localhost:3002/api/${cleanEndpoint}`;
  }
};

// Health check URL
export const HEALTH_CHECK_URL = process.env.NODE_ENV === 'production' 
  ? '/health' 
  : 'http://localhost:3002/health';

console.log('🔧 API Configuration:');
console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', API_BASE_URL);
console.log('Health Check URL:', HEALTH_CHECK_URL); 