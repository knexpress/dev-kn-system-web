// Debug utility for authentication issues
export const debugAuth = () => {
  if (typeof window === 'undefined') {
    console.log('Debug: Running on server side');
    return;
  }

  console.log('=== AUTH DEBUG INFO ===');
  
  // Check sessionStorage
  const sessionUser = sessionStorage.getItem('knex-user');
  console.log('Session User:', sessionUser ? 'Present' : 'Missing');
  if (sessionUser) {
    try {
      const user = JSON.parse(sessionUser);
      console.log('User Data:', { 
        email: user.email, 
        name: user.full_name, 
        department: user.department?.name 
      });
    } catch (e) {
      console.log('Session User Data: Invalid JSON');
    }
  }

  // Check localStorage token
  const token = localStorage.getItem('authToken');
  console.log('Auth Token:', token ? 'Present' : 'Missing');
  if (token) {
    console.log('Token Length:', token.length);
    console.log('Token Preview:', token.substring(0, 20) + '...');
  }

  // Check API client token
  const { apiClient } = require('./api-client');
  const apiToken = apiClient.getToken();
  console.log('API Client Token:', apiToken ? 'Present' : 'Missing');

  console.log('========================');
};

// Auto-run debug on import in development
if (process.env.NODE_ENV === 'development') {
  // Only run after a short delay to ensure everything is loaded
  setTimeout(debugAuth, 1000);
}
