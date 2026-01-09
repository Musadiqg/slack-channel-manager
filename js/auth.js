// ==========================================================================
// Google OAuth 2.0 Authentication using Google Identity Services (GIS)
// ==========================================================================

let isSignedIn = false;
let tokenClient = null;
let accessToken = null;

/**
 * Initialize Google API client (for Sheets API calls)
 */
function initGoogleAPI() {
  return new Promise((resolve, reject) => {
    if (typeof gapi === 'undefined') {
      reject(new Error('Google API library not loaded. Please check your internet connection.'));
      return;
    }
    
    if (typeof CONFIG === 'undefined') {
      reject(new Error('Configuration not loaded. Please check config.js'));
      return;
    }
    
    gapi.load('client', () => {
      gapi.client.init({
        discoveryDocs: CONFIG.DISCOVERY_DOCS,
      }).then(() => {
        console.log('Google Sheets API client initialized');
        resolve();
      }).catch(error => {
        console.error('Google API initialization error:', error);
        reject(error);
      });
    });
  });
}

/**
 * Initialize Google Identity Services for OAuth
 */
function initGoogleIdentityServices() {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts) {
      reject(new Error('Google Identity Services not loaded. Please check your internet connection.'));
      return;
    }
    
    if (typeof CONFIG === 'undefined') {
      reject(new Error('Configuration not loaded. Please check config.js'));
      return;
    }
    
    console.log('Initializing Google Identity Services...');
    
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('Token response error:', response);
          showToast('error', 'Authentication failed: ' + response.error);
          return;
        }
        
        console.log('Token received successfully');
        accessToken = response.access_token;
        isSignedIn = true;
        
        // Set the token for gapi.client
        gapi.client.setToken({ access_token: accessToken });
        
        // Update UI and load data
        updateSignInStatus(true);
        showToast('success', 'Signed in successfully!');
      },
    });
    
    console.log('Google Identity Services initialized');
    resolve();
  });
}

/**
 * Update UI based on sign-in status
 */
function updateSignInStatus(signedIn) {
  isSignedIn = signedIn;
  
  const loginPrompt = document.getElementById('login-prompt');
  const mainApp = document.getElementById('main-app');
  const loadingState = document.getElementById('loading-state');
  
  // Hide loading state
  if (loadingState) {
    loadingState.classList.add('hidden');
  }
  
  if (signedIn) {
    // Hide login, show app
    if (loginPrompt) loginPrompt.classList.add('hidden');
    if (mainApp) mainApp.classList.add('active');
    
    // Setup event listeners for the app
    if (typeof setupEventListeners === 'function') {
      setupEventListeners();
    }
    
    // Load data after successful sign-in
    if (typeof loadInitialData === 'function') {
      loadInitialData();
    }
  } else {
    // Show login, hide app
    if (loginPrompt) loginPrompt.classList.remove('hidden');
    if (mainApp) mainApp.classList.remove('active');
  }
}

/**
 * Sign in user
 */
async function signIn() {
  try {
    if (typeof google === 'undefined' || !google.accounts) {
      showToast('error', 'Google Identity Services not loaded. Please refresh the page.');
      return;
    }
    
    if (!tokenClient) {
      console.log('Token client not initialized, initializing...');
      
      if (typeof CONFIG === 'undefined') {
        showToast('error', 'Configuration not loaded. Please check config.js');
        return;
      }
      
      await initGoogleIdentityServices();
    }
    
    if (!tokenClient) {
      showToast('error', 'Failed to initialize authentication. Please check the console for errors.');
      return;
    }
    
    console.log('Requesting access token...');
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (error) {
    console.error('Sign-in error:', error);
    showToast('error', 'Failed to sign in: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Sign out user
 */
function signOut() {
  if (!isSignedIn || !accessToken) {
    updateSignInStatus(false);
    return;
  }
  
  // Revoke the token
  if (google && google.accounts && google.accounts.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Token revoked');
    });
  }
  
  accessToken = null;
  isSignedIn = false;
  tokenClient = null;
  
  // Clear gapi token
  if (gapi && gapi.client) {
    gapi.client.setToken(null);
  }
  
  clearCache();
  updateSignInStatus(false);
  showToast('info', 'Signed out successfully');
}

/**
 * Get access token
 */
function getAccessToken() {
  return accessToken;
}

/**
 * Check if user is signed in
 */
function checkSignedIn() {
  return isSignedIn && accessToken !== null;
}
