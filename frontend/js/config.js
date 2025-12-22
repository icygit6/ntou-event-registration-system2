// Determine API URL based on environment
const API_URL = 
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' // On Vercel: use relative paths (requests go to same domain)
    : 'http://localhost:5500'; // Local development

export { API_URL };