import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeConfig } from './services/config'
import { initializeApiClient } from './services/api'

// Initialize configuration on app startup
async function initializeApp() {
  try {
    // Step 1: Initialize config (fetch from /api/config endpoint)
    await initializeConfig()
    
    // Step 2: Initialize API client with the configured base URL
    await initializeApiClient()
    
    console.log('✓ App initialization complete')
    
    // Step 3: Render the app
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('❌ App initialization failed:', error)
    // Still render the app with fallback configuration
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

// Start the app
initializeApp()
