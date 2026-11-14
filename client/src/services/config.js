/**
 * Configuration Service
 * Dynamically discovers the backend API URL from the server
 * This allows the frontend to work in any deployment without hardcoding
 */

let API_BASE_URL = null;
let CONFIG_INITIALIZED = false;

/**
 * Initialize configuration by fetching from /api/config endpoint
 * This should be called once on app startup, before any API calls
 */
export async function initializeConfig() {
  if (CONFIG_INITIALIZED) {
    console.log('✓ Config already initialized:', API_BASE_URL);
    return API_BASE_URL;
  }

  try {
    // First try to fetch config from the current origin
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const config = await response.json();
    API_BASE_URL = config.apiUrl;
    CONFIG_INITIALIZED = true;

    console.log('✓ API Configuration Initialized');
    console.log('  • API URL:', API_BASE_URL);
    console.log('  • Environment:', config.environment);

    return API_BASE_URL;
  } catch (error) {
    console.warn('⚠ Failed to fetch config from /api/config, using fallback');
    console.warn('  Error:', error.message);

    // Fallback: Use environment variable or current origin
    API_BASE_URL =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      window.location.origin;

    CONFIG_INITIALIZED = true;

    console.log('✓ Using Fallback API URL:', API_BASE_URL);

    return API_BASE_URL;
  }
}

/**
 * Get the configured API base URL
 * Must call initializeConfig() first
 *
 * @returns {string} The base URL for API calls
 * @throws {Error} If config not initialized
 */
export function getApiUrl() {
  if (!CONFIG_INITIALIZED) {
    console.error('❌ Config not initialized! Call initializeConfig() first');
    throw new Error('Configuration not initialized. Call initializeConfig() on app startup.');
  }
  return API_BASE_URL;
}

/**
 * Reset configuration (mainly for testing)
 */
export function resetConfig() {
  API_BASE_URL = null;
  CONFIG_INITIALIZED = false;
}

/**
 * Check if configuration is initialized
 */
export function isConfigInitialized() {
  return CONFIG_INITIALIZED;
}

export default {
  initializeConfig,
  getApiUrl,
  resetConfig,
  isConfigInitialized,
};
