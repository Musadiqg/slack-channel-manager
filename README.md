# Channel Tag Manager

A modern web application for managing Slack channel tags using Google Sheets as the backend. Built with vanilla JavaScript and hosted on GitHub Pages.

## Features

- ✅ **Multi-tag support** - Assign multiple tags to each channel
- ✅ **Fast performance** - Direct Google Sheets API access, no server delays
- ✅ **Local editing** - Make changes locally, save when ready
- ✅ **Tag filtering** - Filter channels by tag
- ✅ **Search** - Search channels by name or tag
- ✅ **Statistics** - View channel and tag statistics
- ✅ **Modern UI** - Clean, responsive design with Lato font
- ✅ **Free hosting** - GitHub Pages (free forever)

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost` (for local testing)
     - `https://YOUR_USERNAME.github.io` (for GitHub Pages)
   - Add authorized redirect URIs:
     - `http://localhost` (for local testing)
     - `https://YOUR_USERNAME.github.io` (for GitHub Pages)
   - Click "Create"
   - **Copy the Client ID** (you'll need this)

### 2. Configure the Application

1. Open `config.js`
2. Replace `YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID from step 1
3. The Sheet ID is already configured: `10KqjkqHdJ_22McDuXDRvsVjdVESpHPCqEv9ZZntPh24`

### 3. Local Testing (Optional)

1. Serve the files using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```
2. Open `http://localhost:8000` in your browser
3. Sign in with your Google account
4. Test the application

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository (or use existing)
2. Push all files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Select "Deploy from a branch"
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
   - Click "Save"
4. Your app will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. **Important**: Update OAuth credentials in Google Cloud Console with your GitHub Pages URL

### 5. Google Sheet Setup

Your Google Sheet should have:
- **Main sheet** named "Channels" with columns:
  - Column A: Name
  - Column B: Type
  - Column C: Members
  - Column D: Tags (comma-separated)
- **Tags sheet** named "Tags" with:
  - Column A: Prefix (list of all available tags)

## File Structure

```
slack-nomenclature/
├── index.html              # Main HTML file
├── config.js              # Configuration (Sheet ID, OAuth Client ID)
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── app.js             # Main application logic
│   ├── auth.js            # OAuth authentication
│   ├── sheets-api.js      # Google Sheets API wrapper
│   └── utils.js           # Utility functions
├── extract_prefixes.py    # Python script for initial setup
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Usage

1. **Sign In**: Click "Sign in with Google" and authorize the application
2. **View Channels**: All channels load automatically
3. **Filter**: Click a tag in the sidebar to filter channels
4. **Search**: Type in the search box to find channels
5. **Edit Tags**: 
   - Click a channel to select it
   - Add/remove tags using the dropdown
   - Click "Update Tags (Local)" to save locally
   - Click "Save Changes" in header to update the sheet
6. **Refresh**: Click "Refresh" to reload data from the sheet

## Troubleshooting

### "User not signed in" error
- Make sure you've signed in with Google
- Check that OAuth credentials are correctly configured
- Verify the authorized origins include your GitHub Pages URL

### "Failed to load channels" error
- Check that the Sheet ID in `config.js` is correct
- Verify the sheet has the correct structure (Channels and Tags sheets)
- Make sure you have access to the Google Sheet
- Check browser console for detailed error messages

### OAuth redirect issues
- Ensure your GitHub Pages URL is added to authorized JavaScript origins
- Make sure you're using HTTPS (GitHub Pages provides this automatically)
- Clear browser cache and try again

### Data not updating
- Click "Refresh" to reload from the sheet
- Check that you have write permissions on the Google Sheet
- Verify the sheet structure matches the expected format

## Development

### Local Development
- Use a local web server (don't open HTML files directly)
- Update OAuth credentials to include `http://localhost`
- Test changes locally before deploying

### Making Changes
- Edit files in `js/`, `css/`, or `index.html`
- Test locally
- Commit and push to GitHub
- Changes deploy automatically to GitHub Pages

## Security Notes

- OAuth Client ID is public (this is normal for client-side apps)
- All API calls are made from the browser
- Sheet permissions are managed via OAuth scopes
- No sensitive data is stored in the code

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all setup steps were completed correctly
3. Ensure your Google Sheet has the correct structure
4. Make sure OAuth credentials are properly configured

## License

This project is open source and available for personal or commercial use.

