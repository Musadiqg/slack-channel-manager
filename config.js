// Configuration for Channel Tag Manager
const CONFIG = {
  SPREADSHEET_ID: '10KqjkqHdJ_22McDuXDRvsVjdVESpHPCqEv9ZZntPh24',
  CLIENT_ID: '321215816286-r2vm0qitad96ti4qakf334fa08l6padq.apps.googleusercontent.com', // Replace with your OAuth Client ID
  API_KEY: '', // Optional: Only needed for public sheets without OAuth
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SHEET_NAMES: {
    MAIN: 'Channels',
    TAGS: 'Tags'
  },
  COLUMNS: {
    NAME: 0,    // Column A
    TYPE: 1,    // Column B
    MEMBERS: 2, // Column C
    TAGS: 3     // Column D
  },
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  PAGINATION_SIZE: 100 // Load channels in chunks
};

