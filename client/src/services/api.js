import axios from 'axios';
import { getApiUrl } from './config';

/**
 * Create axios instance with dynamic base URL
 * The base URL is configured via /api/config endpoint
 * Fallback to environment variables or current origin if config fails
 */
const apiClient = axios.create({
  withCredentials: true, // Include cookies in requests
});

// Set base URL dynamically (will be set after config initialization)
export async function initializeApiClient() {
  try {
    const baseURL = getApiUrl();
    apiClient.defaults.baseURL = baseURL;
    console.log('✓ API Client initialized with baseURL:', baseURL);
  } catch (error) {
    console.error('Failed to initialize API client:', error.message);
    // Fallback to environment or origin
    const fallbackURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;
    apiClient.defaults.baseURL = fallbackURL;
    console.log('⚠ API Client using fallback baseURL:', fallbackURL);
  }
}

export const authAPI = {
  register: async (email, password) => {
    const response = await apiClient.post('/api/auth/register', { email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};

export const ticketsAPI = {
  getTickets: async (status, priority) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    
    const response = await apiClient.get(`/api/tickets?${params.toString()}`);
    return response.data;
  },

  createTicket: async (title, description, priority = 'medium', status = 'open') => {
    const response = await apiClient.post('/api/tickets', {
      title,
      description,
      priority,
      status,
    });
    return response.data;
  },

  updateTicket: async (id, updates) => {
    const response = await apiClient.put(`/api/tickets/${id}`, updates);
    return response.data;
  },

  deleteTicket: async (id) => {
    const response = await apiClient.delete(`/api/tickets/${id}`);
    return response.data;
  },
};

export default apiClient;
